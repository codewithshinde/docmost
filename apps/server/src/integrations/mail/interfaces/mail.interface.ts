import SMTPTransport from 'nodemailer/lib/smtp-transport';

export enum MailOption {
  SMTP = 'smtp',
  Postmark = 'postmark',
  SendGrid = 'sendgrid',
  Mailgun = 'mailgun',
  SES = 'ses',
  Log = 'log',
}

export type MailConfig =
  | { driver: MailOption.SMTP; config: SMTPConfig }
  | { driver: MailOption.Postmark; config: PostmarkConfig }
  | { driver: MailOption.SendGrid; config: SendGridConfig }
  | { driver: MailOption.Mailgun; config: MailgunConfig }
  | { driver: MailOption.SES; config: SesConfig }
  | { driver: MailOption.Log; config: LogConfig };

export interface SMTPConfig extends SMTPTransport.Options {}
export interface PostmarkConfig {
  postmarkToken: string;
}
export interface SendGridConfig {
  apiKey: string;
}
export interface MailgunConfig {
  apiKey: string;
  domain: string;
  apiBaseUrl?: string;
}
export interface SesConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}
export interface LogConfig {}

export interface MailOptions {
  mail: MailConfig;
}

export interface MailOptionsFactory {
  createMailOptions(): Promise<MailConfig> | MailConfig;
}

export interface MailModuleOptions {
  imports?: any[];
}
