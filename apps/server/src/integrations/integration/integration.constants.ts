export const IntegrationKey = {
  CALLS: 'calls',
  MAIL: 'mail',
  CALENDAR: 'calendar',
} as const;

export type IntegrationKeyName =
  (typeof IntegrationKey)[keyof typeof IntegrationKey];

export type CallProvider = 'livekit' | 'jitsi';
export type MailProvider = 'smtp' | 'postmark' | 'sendgrid' | 'mailgun' | 'ses' | 'log';

export interface PublicCallConfig {
  provider: CallProvider;
  enabled: boolean;
  livekitUrl: string | null;
  jitsiDomain: string | null;
  // whether the secrets required for the chosen provider are present
  configured: boolean;
}

export interface CallRuntimeConfig extends PublicCallConfig {
  livekitApiKey: string | null;
  livekitApiSecret: string | null;
  jitsiAppId: string | null;
  jitsiAppSecret: string | null;
}

export interface PublicMailConfig {
  provider: MailProvider;
  enabled: boolean;
  configured: boolean;
  fromAddress: string | null;
  fromName: string | null;
}

export interface MailRuntimeConfig extends PublicMailConfig {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpIgnoreTls: boolean;
  smtpUsername: string | null;
  smtpPassword: string | null;
  postmarkToken: string | null;
  sendgridApiKey: string | null;
  mailgunApiKey: string | null;
  mailgunDomain: string | null;
  mailgunApiBaseUrl: string | null;
  sesAccessKeyId: string | null;
  sesSecretAccessKey: string | null;
  sesRegion: string | null;
}
