import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TemplateRepo } from '@likh/db/repos/template/template.repo';
import { SpaceMemberRepo } from '@likh/db/repos/space/space-member.repo';
import { PaginationOptions } from '@likh/db/pagination/pagination-options';
import { Page, Template, User, Workspace } from '@likh/db/types/entity.types';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../casl/interfaces/workspace-ability.type';
import { PageService } from '../page/services/page.service';
import { jsonToText } from 'src/collaboration/collaboration.util';
import {
  AUDIT_SERVICE,
  IAuditService,
} from '../../integrations/audit/audit.service';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import {
  CreateTemplateDto,
  ListTemplatesDto,
  UpdateTemplateDto,
  UseTemplateDto,
} from './dto/template.dto';

@Injectable()
export class TemplateService {
  constructor(
    private readonly templateRepo: TemplateRepo,
    private readonly spaceMemberRepo: SpaceMemberRepo,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
    private readonly pageService: PageService,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {}

  async getTemplates(
    user: User,
    workspace: Workspace,
    dto: ListTemplatesDto,
    pagination: PaginationOptions,
  ) {
    if (dto.spaceId) {
      await this.assertSpaceAccess(user, dto.spaceId, SpaceCaslAction.Read);
    }

    const accessibleSpaceIds = await this.spaceMemberRepo.getUserSpaceIds(
      user.id,
    );

    return this.templateRepo.findTemplates(
      workspace.id,
      accessibleSpaceIds,
      pagination,
      { spaceId: dto.spaceId },
    );
  }

  async getTemplateById(
    templateId: string,
    user: User,
    workspace: Workspace,
  ): Promise<Template> {
    const template = await this.templateRepo.findById(templateId, workspace.id, {
      includeContent: true,
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.spaceId) {
      await this.assertSpaceAccess(
        user,
        template.spaceId,
        SpaceCaslAction.Read,
      );
    }

    return template;
  }

  async createTemplate(
    dto: CreateTemplateDto,
    user: User,
    workspace: Workspace,
  ): Promise<Template> {
    if (dto.spaceId) {
      await this.assertSpaceAccess(user, dto.spaceId, SpaceCaslAction.Edit);
    } else {
      this.assertWorkspaceTemplateAccess(user, workspace);
    }

    const textContent = dto.content
      ? jsonToText(dto.content as any)
      : undefined;

    const { id } = await this.templateRepo.insertTemplate({
      title: dto.title,
      description: dto.description,
      content: dto.content as any,
      icon: dto.icon,
      spaceId: dto.spaceId ?? null,
      workspaceId: workspace.id,
      creatorId: user.id,
      lastUpdatedById: user.id,
      textContent,
    });

    const template = await this.templateRepo.findById(id, workspace.id, {
      includeContent: true,
    });

    this.auditService.log({
      event: AuditEvent.TEMPLATE_CREATED,
      resourceType: AuditResource.TEMPLATE,
      resourceId: template.id,
      spaceId: template.spaceId,
      metadata: { title: template.title },
    });

    return template;
  }

  async updateTemplate(
    dto: UpdateTemplateDto,
    user: User,
    workspace: Workspace,
  ): Promise<Template> {
    const template = await this.templateRepo.findById(
      dto.templateId,
      workspace.id,
    );

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.assertTemplateWriteAccess(template, user, workspace);

    if (dto.spaceId !== undefined && dto.spaceId !== template.spaceId) {
      if (dto.spaceId) {
        await this.assertSpaceAccess(user, dto.spaceId, SpaceCaslAction.Edit);
      } else {
        this.assertWorkspaceTemplateAccess(user, workspace);
      }
    }

    const textContent =
      dto.content !== undefined
        ? jsonToText(dto.content as any)
        : undefined;

    await this.templateRepo.updateTemplate(
      {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.content !== undefined && {
          content: dto.content as any,
          textContent,
        }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.spaceId !== undefined && { spaceId: dto.spaceId }),
        lastUpdatedById: user.id,
      },
      dto.templateId,
      workspace.id,
    );

    const updatedTemplate = await this.templateRepo.findById(
      dto.templateId,
      workspace.id,
      { includeContent: true },
    );

    this.auditService.log({
      event: AuditEvent.TEMPLATE_UPDATED,
      resourceType: AuditResource.TEMPLATE,
      resourceId: updatedTemplate.id,
      spaceId: updatedTemplate.spaceId,
      metadata: { title: updatedTemplate.title },
    });

    return updatedTemplate;
  }

  async deleteTemplate(
    templateId: string,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    const template = await this.templateRepo.findById(
      templateId,
      workspace.id,
    );

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.assertTemplateWriteAccess(template, user, workspace);

    await this.templateRepo.deleteTemplate(templateId, workspace.id);

    this.auditService.log({
      event: AuditEvent.TEMPLATE_DELETED,
      resourceType: AuditResource.TEMPLATE,
      resourceId: template.id,
      spaceId: template.spaceId,
      metadata: { title: template.title },
    });
  }

  async useTemplate(
    dto: UseTemplateDto,
    user: User,
    workspace: Workspace,
  ): Promise<Page> {
    const template = await this.templateRepo.findById(
      dto.templateId,
      workspace.id,
      { includeContent: true },
    );

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.assertSpaceAccess(user, dto.spaceId, SpaceCaslAction.Edit);

    const page = await this.pageService.create(user.id, workspace.id, {
      title: template.title,
      icon: template.icon,
      parentPageId: dto.parentPageId,
      spaceId: dto.spaceId,
      ...(template.content && {
        content: template.content as any,
        format: 'json',
      }),
    });

    this.auditService.log({
      event: AuditEvent.TEMPLATE_USED,
      resourceType: AuditResource.TEMPLATE,
      resourceId: template.id,
      spaceId: dto.spaceId,
      metadata: { pageId: page.id },
    });

    return page;
  }

  private async assertTemplateWriteAccess(
    template: Template,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    if (template.spaceId) {
      await this.assertSpaceAccess(user, template.spaceId, SpaceCaslAction.Edit);
    } else {
      this.assertWorkspaceTemplateAccess(user, workspace);
    }
  }

  private async assertSpaceAccess(
    user: User,
    spaceId: string,
    action: SpaceCaslAction,
  ): Promise<void> {
    const ability = await this.spaceAbility.createForUser(user, spaceId);
    if (ability.cannot(action, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }
  }

  private assertWorkspaceTemplateAccess(user: User, workspace: Workspace): void {
    const settings = workspace.settings as Record<string, any> | null;
    if (settings?.templates?.allowMemberTemplates) {
      return;
    }

    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }
  }
}
