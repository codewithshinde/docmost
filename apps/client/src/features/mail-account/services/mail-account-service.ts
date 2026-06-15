import api from "@/lib/api-client";
import {
  IConnectionTestResult,
  IListMailMessages,
  IMailAccountView,
  IMailMessageDetail,
  IMailMessageListResult,
  IMailUnreadCount,
  ISaveMailAccount,
  ISendMailMessage,
} from "../types/mail-account.types";

export async function getMailAccount(): Promise<IMailAccountView> {
  const req = await api.post<IMailAccountView>("/mail-accounts/me");
  return req.data;
}

export async function saveMailAccount(
  data: ISaveMailAccount,
): Promise<IMailAccountView> {
  const req = await api.post<IMailAccountView>(
    "/mail-accounts/me/save",
    data,
  );
  return req.data;
}

export async function deleteMailAccount(): Promise<void> {
  await api.post("/mail-accounts/me/delete");
}

export async function testMailAccount(): Promise<IConnectionTestResult> {
  const req = await api.post<IConnectionTestResult>("/mail-accounts/me/test");
  return req.data;
}

export async function listMailMessages(
  data: IListMailMessages,
): Promise<IMailMessageListResult> {
  const req = await api.post<IMailMessageListResult>(
    "/mail-accounts/me/messages",
    data,
  );
  return req.data;
}

export async function getMailMessage(
  uid: number,
): Promise<IMailMessageDetail> {
  const req = await api.post<IMailMessageDetail>(
    "/mail-accounts/me/messages/get",
    { uid },
  );
  return req.data;
}

export async function getMailUnreadCount(): Promise<IMailUnreadCount> {
  const req = await api.post<IMailUnreadCount>(
    "/mail-accounts/me/unread-count",
  );
  return req.data;
}

export async function testSmtpConnection(): Promise<IConnectionTestResult> {
  const req = await api.post<IConnectionTestResult>(
    "/mail-accounts/me/test-smtp",
  );
  return req.data;
}

export async function sendMailMessage(
  data: ISendMailMessage,
): Promise<{ ok: true }> {
  const req = await api.post<{ ok: true }>("/mail-accounts/me/send", data);
  return req.data;
}
