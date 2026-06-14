import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiKeyRepo } from '@docmost/db/repos/api-key/api-key.repo';
import { ApiKey, User, Workspace } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { TokenService } from '../auth/services/token.service';
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
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-key.dto';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly apiKeyRepo: ApiKeyRepo,
    private readonly tokenService: TokenService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {}

  async getApiKeys(
    user: User,
    workspace: Workspace,
    pagination: PaginationOptions,
    adminView?: boolean,
  ) {
    let creatorId: string | undefined = user.id;

    if (adminView) {
      const ability = this.workspaceAbility.createForUser(user, workspace);
      if (
        ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.API)
      ) {
        throw new ForbiddenException();
      }
      creatorId = undefined;
    }

    return this.apiKeyRepo.findApiKeys(workspace.id, pagination, {
      creatorId,
    });
  }

  async createApiKey(
    dto: CreateApiKeyDto,
    user: User,
    workspace: Workspace,
  ): Promise<ApiKey & { token: string }> {
    this.assertCanCreate(user, workspace);

    const apiKey = await this.apiKeyRepo.insertApiKey({
      name: dto.name,
      creatorId: user.id,
      workspaceId: workspace.id,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    const token = await this.tokenService.generateApiToken({
      apiKeyId: apiKey.id,
      user,
      workspaceId: workspace.id,
    });

    this.auditService.log({
      event: AuditEvent.API_KEY_CREATED,
      resourceType: AuditResource.API_KEY,
      resourceId: apiKey.id,
      metadata: { name: apiKey.name },
    });

    return { ...apiKey, token };
  }

  async updateApiKey(
    dto: UpdateApiKeyDto,
    user: User,
    workspace: Workspace,
  ): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepo.findById(dto.apiKeyId, workspace.id);

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.assertCanManage(apiKey, user, workspace);

    const updatedApiKey = await this.apiKeyRepo.updateApiKey(
      { name: dto.name },
      dto.apiKeyId,
      workspace.id,
    );

    this.auditService.log({
      event: AuditEvent.API_KEY_UPDATED,
      resourceType: AuditResource.API_KEY,
      resourceId: updatedApiKey.id,
      changes: {
        before: { name: apiKey.name },
        after: { name: updatedApiKey.name },
      },
    });

    return updatedApiKey;
  }

  async revokeApiKey(
    apiKeyId: string,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    const apiKey = await this.apiKeyRepo.findById(apiKeyId, workspace.id);

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.assertCanManage(apiKey, user, workspace);

    await this.apiKeyRepo.revokeApiKey(apiKeyId, workspace.id);

    this.auditService.log({
      event: AuditEvent.API_KEY_DELETED,
      resourceType: AuditResource.API_KEY,
      resourceId: apiKey.id,
      metadata: { name: apiKey.name },
    });
  }

  private assertCanCreate(user: User, workspace: Workspace): void {
    const settings = workspace.settings as Record<string, any> | null;
    const restrictToAdmins = settings?.api?.restrictToAdmins === true;

    const ability = this.workspaceAbility.createForUser(user, workspace);
    const requiredAction = restrictToAdmins
      ? WorkspaceCaslAction.Manage
      : WorkspaceCaslAction.Create;

    if (ability.cannot(requiredAction, WorkspaceCaslSubject.API)) {
      throw new ForbiddenException();
    }
  }

  private async assertCanManage(
    apiKey: ApiKey,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    if (apiKey.creatorId === user.id) {
      return;
    }

    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.API)) {
      throw new ForbiddenException();
    }
  }
}
