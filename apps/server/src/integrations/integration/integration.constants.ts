export const IntegrationKey = {
  CALLS: 'calls',
  MAIL: 'mail',
  CALENDAR: 'calendar',
} as const;

export type IntegrationKeyName =
  (typeof IntegrationKey)[keyof typeof IntegrationKey];

export type CallProvider = 'livekit' | 'jitsi';

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
