import api from "@/lib/api-client";
import { IMessageReaction } from "../types/chat.types";

export async function addReaction(data: {
  messageId: string;
  emoji: string;
}): Promise<IMessageReaction[]> {
  const req = await api.post<IMessageReaction[]>("/reactions/add", data);
  return req.data;
}

export async function removeReaction(data: {
  messageId: string;
  emoji: string;
}): Promise<IMessageReaction[]> {
  const req = await api.post<IMessageReaction[]>("/reactions/remove", data);
  return req.data;
}
