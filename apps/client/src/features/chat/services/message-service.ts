import api from "@/lib/api-client";
import { IMessage, IUploadedAttachment } from "../types/chat.types";
import { IPagination } from "@/lib/types";

export async function getChannelMessages(params: {
  channelId: string;
  limit?: number;
  cursor?: string;
  beforeCursor?: string;
}): Promise<IPagination<IMessage>> {
  const req = await api.post<IPagination<IMessage>>("/messages", params);
  return req.data;
}

export async function getThreadMessages(params: {
  rootId: string;
  limit?: number;
  cursor?: string;
  beforeCursor?: string;
}): Promise<IPagination<IMessage>> {
  const req = await api.post<IPagination<IMessage>>("/messages/thread", params);
  return req.data;
}

export async function getMessageById(messageId: string): Promise<IMessage> {
  const req = await api.post<IMessage>("/messages/info", { messageId });
  return req.data;
}

export async function sendMessage(data: {
  channelId: string;
  content?: string;
  rootId?: string;
  attachmentIds?: string[];
  mentionUserIds?: string[];
}): Promise<IMessage> {
  const req = await api.post<IMessage>("/messages/send", data);
  return req.data;
}

export async function updateMessage(data: {
  messageId: string;
  content: string;
}): Promise<IMessage> {
  const req = await api.post<IMessage>("/messages/update", data);
  return req.data;
}

export async function deleteMessage(messageId: string): Promise<IMessage> {
  const req = await api.post<IMessage>("/messages/delete", { messageId });
  return req.data;
}

export async function uploadChatAttachment(
  file: File,
  channelId: string,
  onProgress?: (progress: number) => void,
): Promise<IUploadedAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("channelId", channelId);

  const req = await api.post<IUploadedAttachment>(
    "/attachments/chat-upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    },
  );
  return req as unknown as IUploadedAttachment;
}
