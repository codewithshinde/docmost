import api from "@/lib/api-client";
import {
  ICall,
  ICallConfig,
  IJoinCallResponse,
} from "../types/chat.types";

export async function getCallConfig(): Promise<ICallConfig> {
  const req = await api.post<ICallConfig>("/calls/config");
  return req.data;
}

export async function getActiveCall(channelId: string): Promise<ICall | null> {
  const req = await api.post<ICall | null>("/calls/active", { channelId });
  return req.data;
}

export async function joinCall(channelId: string): Promise<IJoinCallResponse> {
  const req = await api.post<IJoinCallResponse>("/calls/join", { channelId });
  return req.data;
}

export async function leaveCall(callId: string): Promise<void> {
  await api.post("/calls/leave", { callId });
}

export async function setScreenSharing(
  callId: string,
  screenSharing: boolean,
): Promise<void> {
  await api.post("/calls/screen-share", { callId, screenSharing });
}
