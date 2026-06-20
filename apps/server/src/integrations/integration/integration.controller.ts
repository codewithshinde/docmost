import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import WorkspaceAbilityFactory from '../../core/casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../../core/casl/interfaces/workspace-ability.type';
import { IntegrationSettingsService } from './integration-settings.service';
import { IntegrationKey } from './integration.constants';
import {
  UpdateCallSettingsDto,
  UpdateMailSettingsDto,
} from './dto/integration.dto';

@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationController {
  constructor(
    private readonly integrationSettingsService: IntegrationSettingsService,
    private readonly workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  private assertCanManage(user: User, workspace: Workspace) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('calls')
  async getCallSettings(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);
    const view = await this.integrationSettingsService.getView(
      workspace.id,
      IntegrationKey.CALLS,
    );
    const runtime = await this.integrationSettingsService.getCallRuntimeConfig(
      workspace.id,
    );
    return {
      ...view,
      effective: this.integrationSettingsService.toPublicCallConfig(runtime),
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('calls/update')
  async updateCallSettings(
    @Body() dto: UpdateCallSettingsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);

    const config: Record<string, any> = {};
    if (dto.provider !== undefined) config.provider = dto.provider;
    if (dto.livekitUrl !== undefined) config.livekitUrl = dto.livekitUrl;
    if (dto.jitsiDomain !== undefined) config.jitsiDomain = dto.jitsiDomain;
    if (dto.jitsiAppId !== undefined) config.jitsiAppId = dto.jitsiAppId;

    // merge into existing config rather than overwrite
    const current = await this.integrationSettingsService.getView(
      workspace.id,
      IntegrationKey.CALLS,
    );

    const view = await this.integrationSettingsService.save(
      workspace.id,
      IntegrationKey.CALLS,
      {
        enabled: dto.enabled,
        config: { ...current.config, ...config },
        secrets: {
          livekitApiKey: dto.livekitApiKey,
          livekitApiSecret: dto.livekitApiSecret,
          jitsiAppSecret: dto.jitsiAppSecret,
        },
      },
      user.id,
    );

    const runtime = await this.integrationSettingsService.getCallRuntimeConfig(
      workspace.id,
    );
    return {
      ...view,
      effective: this.integrationSettingsService.toPublicCallConfig(runtime),
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('mail')
  async getMailSettings(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);
    const view = await this.integrationSettingsService.getView(
      workspace.id,
      IntegrationKey.MAIL,
    );
    const runtime = await this.integrationSettingsService.getMailRuntimeConfig(
      workspace.id,
    );
    return {
      ...view,
      effective: this.integrationSettingsService.toPublicMailConfig(runtime),
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('mail/update')
  async updateMailSettings(
    @Body() dto: UpdateMailSettingsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);

    const current = await this.integrationSettingsService.getView(
      workspace.id,
      IntegrationKey.MAIL,
    );

    const config: Record<string, any> = {};
    for (const key of [
      'provider',
      'fromAddress',
      'fromName',
      'smtpHost',
      'smtpPort',
      'smtpSecure',
      'smtpIgnoreTls',
      'mailgunDomain',
      'mailgunApiBaseUrl',
      'sesRegion',
    ]) {
      if (dto[key] !== undefined) config[key] = dto[key];
    }

    const view = await this.integrationSettingsService.save(
      workspace.id,
      IntegrationKey.MAIL,
      {
        enabled: dto.enabled,
        config: { ...current.config, ...config },
        secrets: {
          smtpUsername: dto.smtpUsername,
          smtpPassword: dto.smtpPassword,
          postmarkToken: dto.postmarkToken,
          sendgridApiKey: dto.sendgridApiKey,
          mailgunApiKey: dto.mailgunApiKey,
          sesAccessKeyId: dto.sesAccessKeyId,
          sesSecretAccessKey: dto.sesSecretAccessKey,
        },
      },
      user.id,
    );

    const runtime = await this.integrationSettingsService.getMailRuntimeConfig(
      workspace.id,
    );
    return {
      ...view,
      effective: this.integrationSettingsService.toPublicMailConfig(runtime),
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('mail/test')
  async testMailSettings(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);
    const runtime = await this.integrationSettingsService.getMailRuntimeConfig(
      workspace.id,
    );

    if (!runtime.configured) {
      return {
        ok: false,
        message: 'Mail is missing required provider settings or sender identity',
      };
    }

    if (runtime.provider === 'smtp') {
      try {
        const transporter = nodemailer.createTransport({
          host: runtime.smtpHost,
          port: runtime.smtpPort,
          secure: runtime.smtpSecure,
          ignoreTLS: runtime.smtpIgnoreTls,
          auth:
            runtime.smtpUsername && runtime.smtpPassword
              ? {
                  user: runtime.smtpUsername,
                  pass: runtime.smtpPassword,
                }
              : undefined,
        });
        await transporter.verify();
        return { ok: true, message: 'Successfully connected to SMTP server' };
      } catch (err) {
        return {
          ok: false,
          message:
            err instanceof Error ? err.message : 'SMTP connection failed',
        };
      }
    }

    return {
      ok: true,
      message: `${runtime.provider} mail settings are complete`,
    };
  }
}
