import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AuditRepo } from '@docmost/db/repos/audit/audit.repo';
import { WorkspaceRepo } from '@docmost/db/repos/workspace/workspace.repo';
import { User, Workspace } from '@docmost/db/types/entity.types';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../casl/interfaces/workspace-ability.type';
import {
  AUDIT_SERVICE,
  IAuditService,
} from '../../integrations/audit/audit.service';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import { AuditLogParamsDto, UpdateAuditRetentionDto } from './dto/audit.dto';

export const DEFAULT_AUDIT_RETENTION_DAYS = 365;

@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepo: AuditRepo,
    private readonly workspaceRepo: WorkspaceRepo,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {}

  async getAuditLogs(
    dto: AuditLogParamsDto,
    user: User,
    workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);

    return this.auditRepo.findAuditLogs(workspace.id, dto, {
      event: dto.event,
      resourceType: dto.resourceType,
      actorId: dto.actorId,
      spaceId: dto.spaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });
  }

  getRetention(user: User, workspace: Workspace) {
    this.assertCanManage(user, workspace);

    return {
      retentionDays: workspace.auditRetentionDays ?? DEFAULT_AUDIT_RETENTION_DAYS,
    };
  }

  async updateRetention(
    dto: UpdateAuditRetentionDto,
    user: User,
    workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);

    const before = workspace.auditRetentionDays ?? DEFAULT_AUDIT_RETENTION_DAYS;

    await this.workspaceRepo.updateWorkspace(
      { auditRetentionDays: dto.auditRetentionDays },
      workspace.id,
    );

    await this.auditService.updateRetention(
      workspace.id,
      dto.auditRetentionDays,
    );

    this.auditService.log({
      event: AuditEvent.WORKSPACE_UPDATED,
      resourceType: AuditResource.WORKSPACE,
      resourceId: workspace.id,
      changes: {
        before: { auditRetentionDays: before },
        after: { auditRetentionDays: dto.auditRetentionDays },
      },
    });

    return { retentionDays: dto.auditRetentionDays };
  }

  private assertCanManage(user: User, workspace: Workspace): void {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Audit)) {
      throw new ForbiddenException();
    }
  }
}
