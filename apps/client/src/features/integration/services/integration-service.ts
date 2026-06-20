import api from "@/lib/api-client";
import {
  ICallSettingsView,
  IConnectionTestResult,
  IMailSettingsView,
  IUpdateCallSettings,
  IUpdateMailSettings,
} from "../types/integration.types";

export async function getCallSettings(): Promise<ICallSettingsView> {
  const req = await api.post<ICallSettingsView>("/integrations/calls");
  return req.data;
}

export async function updateCallSettings(
  data: IUpdateCallSettings,
): Promise<ICallSettingsView> {
  const req = await api.post<ICallSettingsView>(
    "/integrations/calls/update",
    data,
  );
  return req.data;
}

export async function testCallConnection(): Promise<IConnectionTestResult> {
  const req = await api.post<IConnectionTestResult>("/calls/test");
  return req.data;
}

export async function getMailSettings(): Promise<IMailSettingsView> {
  const req = await api.post<IMailSettingsView>("/integrations/mail");
  return req.data;
}

export async function updateMailSettings(
  data: IUpdateMailSettings,
): Promise<IMailSettingsView> {
  const req = await api.post<IMailSettingsView>(
    "/integrations/mail/update",
    data,
  );
  return req.data;
}

export async function testMailConnection(): Promise<IConnectionTestResult> {
  const req = await api.post<IConnectionTestResult>("/integrations/mail/test");
  return req.data;
}
