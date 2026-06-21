import { Injectable } from '@nestjs/common';
import { IntegrationSettingsRepo } from '@likh/db/repos/integration/integration-settings.repo';
import { EncryptionService } from '../crypto/encryption.service';
import { EnvironmentService } from '../environment/environment.service';
import {
  CallProvider,
  CallRuntimeConfig,
  IntegrationKey,
  IntegrationKeyName,
  MailProvider,
  MailRuntimeConfig,
  PublicCallConfig,
  PublicMailConfig,
} from './integration.constants';

export interface SettingView {
  key: string;
  enabled: boolean;
  config: Record<string, any>;
  // names of secret fields that are currently set (values never returned)
  secretKeys: string[];
}

export interface SaveSettingInput {
  enabled?: boolean;
  config?: Record<string, any>;
  // partial secret map: empty/blank values are ignored so existing secrets
  // are preserved; null value explicitly clears a secret.
  secrets?: Record<string, string | null | undefined>;
}

@Injectable()
export class IntegrationSettingsService {
  constructor(
    private readonly repo: IntegrationSettingsRepo,
    private readonly encryption: EncryptionService,
    private readonly environmentService: EnvironmentService,
  ) {}

  async getView(workspaceId: string, key: IntegrationKeyName): Promise<SettingView> {
    const row = await this.repo.findByKey(workspaceId, key);
    const secrets = this.encryption.decryptJson(row?.secrets);
    return {
      key,
      enabled: row?.enabled ?? false,
      config: (row?.config as Record<string, any>) ?? {},
      secretKeys: Object.keys(secrets).filter(
        (k) => secrets[k] !== undefined && secrets[k] !== null && secrets[k] !== '',
      ),
    };
  }

  async getDecryptedSecrets(
    workspaceId: string,
    key: IntegrationKeyName,
  ): Promise<Record<string, any>> {
    const row = await this.repo.findByKey(workspaceId, key);
    return this.encryption.decryptJson(row?.secrets);
  }

  async save(
    workspaceId: string,
    key: IntegrationKeyName,
    input: SaveSettingInput,
    userId: string,
  ): Promise<SettingView> {
    const existing = await this.repo.findByKey(workspaceId, key);
    const existingSecrets = this.encryption.decryptJson(existing?.secrets);

    let secretsBlob: string | null | undefined;
    if (input.secrets) {
      const merged = { ...existingSecrets };
      for (const [field, value] of Object.entries(input.secrets)) {
        if (value === null) {
          delete merged[field];
        } else if (value !== undefined && value !== '') {
          merged[field] = value;
        }
        // blank/undefined => keep existing value
      }
      secretsBlob = this.encryption.encryptJson(merged);
    }

    await this.repo.upsert(
      workspaceId,
      key,
      {
        enabled: input.enabled,
        config: input.config,
        secrets: secretsBlob,
        updatedById: userId,
      },
    );

    return this.getView(workspaceId, key);
  }

  // ---- Calls ----------------------------------------------------------------

  private firstNonEmpty(...vals: (string | null | undefined)[]): string | null {
    for (const v of vals) {
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
  }

  async getCallRuntimeConfig(workspaceId: string): Promise<CallRuntimeConfig> {
    const row = await this.repo.findByKey(workspaceId, IntegrationKey.CALLS);
    const config = (row?.config as Record<string, any>) ?? {};
    const secrets = this.encryption.decryptJson(row?.secrets);

    const livekitUrl = this.firstNonEmpty(
      config.livekitUrl,
      this.environmentService.getLiveKitUrl(),
    );
    const livekitApiKey = this.firstNonEmpty(
      secrets.livekitApiKey,
      this.environmentService.getLiveKitApiKey(),
    );
    const livekitApiSecret = this.firstNonEmpty(
      secrets.livekitApiSecret,
      this.environmentService.getLiveKitApiSecret(),
    );

    const jitsiDomain = this.firstNonEmpty(
      config.jitsiDomain,
      this.environmentService.getJitsiDomain(),
    );
    const jitsiAppId = this.firstNonEmpty(
      config.jitsiAppId,
      this.environmentService.getJitsiAppId(),
    );
    const jitsiAppSecret = this.firstNonEmpty(
      secrets.jitsiAppSecret,
      this.environmentService.getJitsiAppSecret(),
    );

    const liveKitConfigured = Boolean(
      livekitUrl && livekitApiKey && livekitApiSecret,
    );
    const jitsiConfigured = Boolean(jitsiDomain);

    const provider: CallProvider =
      (config.provider as CallProvider) ||
      (liveKitConfigured ? 'livekit' : jitsiConfigured ? 'jitsi' : 'livekit');

    const configured =
      provider === 'livekit' ? liveKitConfigured : jitsiConfigured;

    // When there is no saved row, auto-enable if env credentials are present
    // (preserves prior env-only behavior). Otherwise honor the saved toggle.
    const enabled = row ? row.enabled && configured : configured;

    return {
      provider,
      enabled,
      configured,
      livekitUrl,
      livekitApiKey,
      livekitApiSecret,
      jitsiDomain,
      jitsiAppId,
      jitsiAppSecret,
    };
  }

  toPublicCallConfig(runtime: CallRuntimeConfig): PublicCallConfig {
    return {
      provider: runtime.provider,
      enabled: runtime.enabled,
      configured: runtime.configured,
      livekitUrl: runtime.livekitUrl,
      jitsiDomain: runtime.jitsiDomain,
    };
  }

  // ---- Mail -----------------------------------------------------------------

  private firstNumber(...vals: (number | string | null | undefined)[]): number | null {
    for (const v of vals) {
      if (v === undefined || v === null || v === '') continue;
      const parsed = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  async getMailRuntimeConfig(workspaceId?: string): Promise<MailRuntimeConfig> {
    const row = workspaceId
      ? await this.repo.findByKey(workspaceId, IntegrationKey.MAIL)
      : undefined;
    const config = (row?.config as Record<string, any>) ?? {};
    const secrets = this.encryption.decryptJson(row?.secrets);

    const envDriver = this.environmentService.getMailDriver()?.toLowerCase();
    const provider: MailProvider =
      (config.provider as MailProvider) || (envDriver as MailProvider) || 'log';

    const fromAddress = this.firstNonEmpty(
      config.fromAddress,
      this.environmentService.getMailFromAddress(),
    );
    const fromName = this.firstNonEmpty(
      config.fromName,
      this.environmentService.getMailFromName(),
    );

    const smtpHost = this.firstNonEmpty(
      config.smtpHost,
      this.environmentService.getSmtpHost(),
    );
    const smtpPort = this.firstNumber(
      config.smtpPort,
      this.environmentService.getSmtpPort(),
    );
    const smtpSecure =
      config.smtpSecure !== undefined
        ? !!config.smtpSecure
        : this.environmentService.getSmtpSecure();
    const smtpIgnoreTls =
      config.smtpIgnoreTls !== undefined
        ? !!config.smtpIgnoreTls
        : this.environmentService.getSmtpIgnoreTLS();
    const smtpUsername = this.firstNonEmpty(
      secrets.smtpUsername,
      this.environmentService.getSmtpUsername(),
    );
    const smtpPassword = this.firstNonEmpty(
      secrets.smtpPassword,
      this.environmentService.getSmtpPassword(),
    );

    const postmarkToken = this.firstNonEmpty(
      secrets.postmarkToken,
      this.environmentService.getPostmarkToken(),
    );
    const sendgridApiKey = this.firstNonEmpty(
      secrets.sendgridApiKey,
      this.environmentService.getSendGridApiKey(),
    );
    const mailgunApiKey = this.firstNonEmpty(
      secrets.mailgunApiKey,
      this.environmentService.getMailgunApiKey(),
    );
    const mailgunDomain = this.firstNonEmpty(
      config.mailgunDomain,
      this.environmentService.getMailgunDomain(),
    );
    const mailgunApiBaseUrl = this.firstNonEmpty(
      config.mailgunApiBaseUrl,
      this.environmentService.getMailgunApiBaseUrl(),
    );
    const sesAccessKeyId = this.firstNonEmpty(
      secrets.sesAccessKeyId,
      this.environmentService.getSesAccessKeyId(),
    );
    const sesSecretAccessKey = this.firstNonEmpty(
      secrets.sesSecretAccessKey,
      this.environmentService.getSesSecretAccessKey(),
    );
    const sesRegion = this.firstNonEmpty(
      config.sesRegion,
      this.environmentService.getSesRegion(),
    );

    const configured =
      provider === 'log' ||
      (provider === 'smtp' && Boolean(smtpHost && smtpPort && fromAddress)) ||
      (provider === 'postmark' && Boolean(postmarkToken && fromAddress)) ||
      (provider === 'sendgrid' && Boolean(sendgridApiKey && fromAddress)) ||
      (provider === 'mailgun' &&
        Boolean(mailgunApiKey && mailgunDomain && fromAddress)) ||
      (provider === 'ses' &&
        Boolean(sesAccessKeyId && sesSecretAccessKey && sesRegion && fromAddress));

    const enabled = row ? row.enabled && configured : configured;

    return {
      provider,
      enabled,
      configured,
      fromAddress,
      fromName,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpIgnoreTls,
      smtpUsername,
      smtpPassword,
      postmarkToken,
      sendgridApiKey,
      mailgunApiKey,
      mailgunDomain,
      mailgunApiBaseUrl,
      sesAccessKeyId,
      sesSecretAccessKey,
      sesRegion,
    };
  }

  toPublicMailConfig(runtime: MailRuntimeConfig): PublicMailConfig {
    return {
      provider: runtime.provider,
      enabled: runtime.enabled,
      configured: runtime.configured,
      fromAddress: runtime.fromAddress,
      fromName: runtime.fromName,
    };
  }
}
