import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PagePermissionRepo,
  PagePermissionMember,
} from '@docmost/db/repos/page/page-permission.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import {
  InsertablePagePermission,
  Page,
  User,
  Workspace,
} from '@docmost/db/types/entity.types';
import { CursorPaginationResult } from '@docmost/db/pagination/cursor-pagination';
import SpaceAbilityFactory from '../../casl/abilities/space-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../../casl/interfaces/space-ability.type';
import { PageAccessService } from '../page-access/page-access.service';
import {
  AUDIT_SERVICE,
  IAuditService,
} from '../../../integrations/audit/audit.service';
import { AuditEvent, AuditResource } from '../../../common/events/audit-events';
import {
  AddPagePermissionDto,
  GetPagePermissionsDto,
  PAGE_ACCESS_LEVEL_RESTRICTED,
  RemovePagePermissionDto,
  UpdatePagePermissionRoleDto,
} from './dto/page-permission.dto';
import { PageIdDto } from '../dto/page.dto';

export interface PageRestrictionInfo {
  restrictionId?: string;
  hasDirectRestriction: boolean;
  hasInheritedRestriction: boolean;
  inheritedFrom?: {
    id: string;
    slugId: string;
    title: string;
  };
  userAccess: {
    canView: boolean;
    canEdit: boolean;
    canManage: boolean;
  };
}

@Injectable()
export class PagePermissionService {
  constructor(
    private readonly pagePermissionRepo: PagePermissionRepo,
    private readonly pageRepo: PageRepo,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly pageAccessService: PageAccessService,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {}

  async restrictPage(
    dto: PageIdDto,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    const page = await this.getPageOrThrow(dto.pageId);
    await this.assertCanManage(user, page);

    const existing = await this.pagePermissionRepo.findPageAccessByPageId(
      page.id,
    );
    if (existing) {
      return;
    }

    await this.pagePermissionRepo.insertPageAccess({
      pageId: page.id,
      workspaceId: workspace.id,
      spaceId: page.spaceId,
      accessLevel: PAGE_ACCESS_LEVEL_RESTRICTED,
      creatorId: user.id,
    });

    this.auditService.log({
      event: AuditEvent.PAGE_RESTRICTED,
      resourceType: AuditResource.PAGE,
      resourceId: page.id,
      spaceId: page.spaceId,
    });
  }

  async unrestrictPage(
    dto: PageIdDto,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    const page = await this.getPageOrThrow(dto.pageId);
    await this.assertCanManage(user, page);

    const existing = await this.pagePermissionRepo.findPageAccessByPageId(
      page.id,
    );
    if (!existing) {
      return;
    }

    await this.pagePermissionRepo.deletePageAccess(page.id);

    this.auditService.log({
      event: AuditEvent.PAGE_RESTRICTION_REMOVED,
      resourceType: AuditResource.PAGE,
      resourceId: page.id,
      spaceId: page.spaceId,
    });
  }

  async addPagePermission(
    dto: AddPagePermissionDto,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    const page = await this.getPageOrThrow(dto.pageId);
    await this.assertCanManage(user, page);

    const userIds = dto.userIds ?? [];
    const groupIds = dto.groupIds ?? [];

    if (userIds.length === 0 && groupIds.length === 0) {
      throw new BadRequestException('No users or groups provided');
    }

    let pageAccess = await this.pagePermissionRepo.findPageAccessByPageId(
      page.id,
    );
    if (!pageAccess) {
      pageAccess = await this.pagePermissionRepo.insertPageAccess({
        pageId: page.id,
        workspaceId: workspace.id,
        spaceId: page.spaceId,
        accessLevel: PAGE_ACCESS_LEVEL_RESTRICTED,
        creatorId: user.id,
      });
    }

    const insertable: InsertablePagePermission[] = [];

    for (const userId of userIds) {
      const existing = await this.pagePermissionRepo.findPagePermissionByUserId(
        pageAccess.id,
        userId,
      );
      if (existing) {
        await this.pagePermissionRepo.updatePagePermissionRole(
          pageAccess.id,
          dto.role,
          { userId },
        );
      } else {
        insertable.push({
          pageAccessId: pageAccess.id,
          userId,
          role: dto.role,
          addedById: user.id,
        });
      }
    }

    for (const groupId of groupIds) {
      const existing = await this.pagePermissionRepo.findPagePermissionByGroupId(
        pageAccess.id,
        groupId,
      );
      if (existing) {
        await this.pagePermissionRepo.updatePagePermissionRole(
          pageAccess.id,
          dto.role,
          { groupId },
        );
      } else {
        insertable.push({
          pageAccessId: pageAccess.id,
          groupId,
          role: dto.role,
          addedById: user.id,
        });
      }
    }

    await this.pagePermissionRepo.insertPagePermissions(insertable);

    this.auditService.log({
      event: AuditEvent.PAGE_PERMISSION_ADDED,
      resourceType: AuditResource.PAGE,
      resourceId: page.id,
      spaceId: page.spaceId,
      metadata: { role: dto.role, userIds, groupIds },
    });
  }

  async removePagePermission(
    dto: RemovePagePermissionDto,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    const page = await this.getPageOrThrow(dto.pageId);
    await this.assertCanManage(user, page);

    const pageAccess = await this.pagePermissionRepo.findPageAccessByPageId(
      page.id,
    );
    if (!pageAccess) {
      return;
    }

    const userIds = dto.userIds ?? [];
    const groupIds = dto.groupIds ?? [];

    if (userIds.length === 0 && groupIds.length === 0) {
      throw new BadRequestException('No users or groups provided');
    }

    await this.assertWritersRemainAfterRemoval(
      pageAccess.id,
      userIds,
      groupIds,
    );

    await this.pagePermissionRepo.deletePagePermissionsByUserIds(
      pageAccess.id,
      userIds,
    );
    await this.pagePermissionRepo.deletePagePermissionsByGroupIds(
      pageAccess.id,
      groupIds,
    );

    this.auditService.log({
      event: AuditEvent.PAGE_PERMISSION_REMOVED,
      resourceType: AuditResource.PAGE,
      resourceId: page.id,
      spaceId: page.spaceId,
      metadata: { userIds, groupIds },
    });
  }

  async updatePagePermissionRole(
    dto: UpdatePagePermissionRoleDto,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    const page = await this.getPageOrThrow(dto.pageId);
    await this.assertCanManage(user, page);

    if (!dto.userId && !dto.groupId) {
      throw new BadRequestException('userId or groupId is required');
    }

    const pageAccess = await this.pagePermissionRepo.findPageAccessByPageId(
      page.id,
    );
    if (!pageAccess) {
      throw new NotFoundException('Page is not restricted');
    }

    if (dto.role === 'reader') {
      const current = dto.userId
        ? await this.pagePermissionRepo.findPagePermissionByUserId(
            pageAccess.id,
            dto.userId,
          )
        : await this.pagePermissionRepo.findPagePermissionByGroupId(
            pageAccess.id,
            dto.groupId,
          );

      if (current?.role === 'writer') {
        const writerCount = await this.pagePermissionRepo.countWritersByPageAccessId(
          pageAccess.id,
        );
        if (writerCount <= 1) {
          throw new BadRequestException('At least one editor must remain');
        }
      }
    }

    await this.pagePermissionRepo.updatePagePermissionRole(
      pageAccess.id,
      dto.role,
      { userId: dto.userId, groupId: dto.groupId },
    );

    this.auditService.log({
      event: AuditEvent.PAGE_PERMISSION_ADDED,
      resourceType: AuditResource.PAGE,
      resourceId: page.id,
      spaceId: page.spaceId,
      metadata: {
        action: 'role_updated',
        role: dto.role,
        userId: dto.userId,
        groupId: dto.groupId,
      },
    });
  }

  async getPagePermissions(
    dto: GetPagePermissionsDto,
    user: User,
    workspace: Workspace,
  ): Promise<CursorPaginationResult<PagePermissionMember>> {
    const page = await this.getPageOrThrow(dto.pageId);
    await this.pageAccessService.validateCanView(page, user);

    const pageAccess = await this.pagePermissionRepo.findPageAccessByPageId(
      page.id,
    );
    if (!pageAccess) {
      return {
        items: [],
        meta: {
          limit: dto.limit,
          hasNextPage: false,
          hasPrevPage: false,
          nextCursor: null,
          prevCursor: null,
        },
      };
    }

    return this.pagePermissionRepo.getPagePermissionsPaginated(
      pageAccess.id,
      dto,
    );
  }

  async getPageRestrictionInfo(
    dto: PageIdDto,
    user: User,
    workspace: Workspace,
  ): Promise<PageRestrictionInfo> {
    const page = await this.getPageOrThrow(dto.pageId);
    await this.pageAccessService.validateCanView(page, user);

    const ability = await this.spaceAbility.createForUser(user, page.spaceId);

    const accessLevel = await this.pagePermissionRepo.getUserPageAccessLevel(
      user.id,
      page.id,
    );

    const pageAccess = accessLevel.hasDirectRestriction
      ? await this.pagePermissionRepo.findPageAccessByPageId(page.id)
      : undefined;

    let inheritedFrom: PageRestrictionInfo['inheritedFrom'];
    if (accessLevel.hasInheritedRestriction) {
      const ancestor = await this.pagePermissionRepo.findRestrictedAncestor(
        page.id,
        { excludeSelf: true },
      );
      if (ancestor) {
        const ancestorPage = await this.pageRepo.findById(ancestor.pageId);
        if (ancestorPage) {
          inheritedFrom = {
            id: ancestorPage.id,
            slugId: ancestorPage.slugId,
            title: ancestorPage.title ?? '',
          };
        }
      }
    }

    return {
      restrictionId: pageAccess?.id,
      hasDirectRestriction: accessLevel.hasDirectRestriction,
      hasInheritedRestriction: accessLevel.hasInheritedRestriction,
      ...(inheritedFrom && { inheritedFrom }),
      userAccess: {
        canView: accessLevel.canAccess,
        canEdit: accessLevel.hasAnyRestriction
          ? accessLevel.canEdit
          : ability.can(SpaceCaslAction.Edit, SpaceCaslSubject.Page),
        canManage: ability.can(SpaceCaslAction.Manage, SpaceCaslSubject.Page),
      },
    };
  }

  private async getPageOrThrow(pageId: string): Promise<Page> {
    const page = await this.pageRepo.findById(pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  private async assertCanManage(user: User, page: Page): Promise<void> {
    const ability = await this.spaceAbility.createForUser(user, page.spaceId);
    if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }
  }

  private async assertWritersRemainAfterRemoval(
    pageAccessId: string,
    userIds: string[],
    groupIds: string[],
  ): Promise<void> {
    const writerCount = await this.pagePermissionRepo.countWritersByPageAccessId(
      pageAccessId,
    );
    if (writerCount === 0) {
      return;
    }

    let removedWriters = 0;
    for (const userId of userIds) {
      const permission = await this.pagePermissionRepo.findPagePermissionByUserId(
        pageAccessId,
        userId,
      );
      if (permission?.role === 'writer') {
        removedWriters++;
      }
    }
    for (const groupId of groupIds) {
      const permission = await this.pagePermissionRepo.findPagePermissionByGroupId(
        pageAccessId,
        groupId,
      );
      if (permission?.role === 'writer') {
        removedWriters++;
      }
    }

    if (removedWriters > 0 && writerCount - removedWriters <= 0) {
      throw new BadRequestException('At least one editor must remain');
    }
  }
}
