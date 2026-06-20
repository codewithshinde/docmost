export interface MailMessage {
  from?: string;
  fromName?: string;
  workspaceId?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: any;
  notificationId?: string;
}
