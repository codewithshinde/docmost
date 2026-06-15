export interface IMailAccountView {
  emailAddress: string | null;
  imapHost: string | null;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  username: string | null;
  configured: boolean;
}

export interface ISaveMailAccount {
  emailAddress: string;
  imapHost: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  username?: string;
  password?: string;
}

export interface IConnectionTestResult {
  ok: boolean;
  message: string;
}

export interface IMailMessageSummary {
  uid: number;
  subject: string;
  from: string;
  fromName: string;
  date: string | null;
  seen: boolean;
}

export interface IMailMessageDetail {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string | null;
  html: string | null;
  text: string | null;
}

export interface IListMailMessages {
  page?: number;
  pageSize?: number;
}

export interface IMailMessageListResult {
  messages: IMailMessageSummary[];
  total: number;
}
