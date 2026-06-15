export type CallProvider = "livekit" | "jitsi";

export interface ICallEffectiveConfig {
  provider: CallProvider;
  enabled: boolean;
  configured: boolean;
  livekitUrl: string | null;
  jitsiDomain: string | null;
}

export interface ICallSettingsView {
  key: string;
  enabled: boolean;
  config: {
    provider?: CallProvider;
    livekitUrl?: string;
    jitsiDomain?: string;
    jitsiAppId?: string;
  };
  secretKeys: string[];
  effective: ICallEffectiveConfig;
}

export interface IUpdateCallSettings {
  enabled?: boolean;
  provider?: CallProvider;
  livekitUrl?: string;
  livekitApiKey?: string;
  livekitApiSecret?: string;
  jitsiDomain?: string;
  jitsiAppId?: string;
  jitsiAppSecret?: string;
}

export interface IConnectionTestResult {
  ok: boolean;
  message: string;
}

export type MailProvider =
  | "smtp"
  | "postmark"
  | "sendgrid"
  | "mailgun"
  | "ses"
  | "log";

export interface IMailEffectiveConfig {
  provider: MailProvider;
  enabled: boolean;
  configured: boolean;
  fromAddress: string | null;
  fromName: string | null;
}

export interface IMailSettingsView {
  key: string;
  enabled: boolean;
  config: {
    provider?: MailProvider;
    fromAddress?: string;
    fromName?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpIgnoreTls?: boolean;
    mailgunDomain?: string;
    mailgunApiBaseUrl?: string;
    sesRegion?: string;
  };
  secretKeys: string[];
  effective: IMailEffectiveConfig;
}

export interface IUpdateMailSettings {
  enabled?: boolean;
  provider?: MailProvider;
  fromAddress?: string;
  fromName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpIgnoreTls?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
  postmarkToken?: string;
  sendgridApiKey?: string;
  mailgunApiKey?: string;
  mailgunDomain?: string;
  mailgunApiBaseUrl?: string;
  sesAccessKeyId?: string;
  sesSecretAccessKey?: string;
  sesRegion?: string;
}
