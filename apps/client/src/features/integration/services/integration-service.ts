import api from "@/lib/api-client";
import {
  ICallSettingsView,
  IConnectionTestResult,
  IUpdateCallSettings,
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
