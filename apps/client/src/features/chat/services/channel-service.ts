import api from "@/lib/api-client";
import { IChannel, IChannelMember, IUnreadCount } from "../types/chat.types";

export async function getTeamChannels(teamId: string): Promise<IChannel[]> {
  const req = await api.post<IChannel[]>("/channels/team", { teamId });
  return req.data;
}

export async function getDirectChannels(): Promise<IChannel[]> {
  const req = await api.post<IChannel[]>("/channels/direct");
  return req.data;
}

export async function getChannelById(channelId: string): Promise<IChannel> {
  const req = await api.post<IChannel>("/channels/info", { channelId });
  return req.data;
}

export async function createChannel(data: {
  teamId: string;
  name: string;
  type?: string;
  topic?: string;
  purpose?: string;
}): Promise<IChannel> {
  const req = await api.post<IChannel>("/channels/create", data);
  return req.data;
}

export async function createDirectChannel(data: {
  userIds: string[];
}): Promise<IChannel> {
  const req = await api.post<IChannel>("/channels/create-direct", data);
  return req.data;
}

export async function updateChannel(data: {
  channelId: string;
  name?: string;
  topic?: string;
  purpose?: string;
}): Promise<IChannel> {
  const req = await api.post<IChannel>("/channels/update", data);
  return req.data;
}

export async function archiveChannel(channelId: string): Promise<void> {
  await api.post("/channels/archive", { channelId });
}

export async function joinChannel(channelId: string): Promise<IChannelMember> {
  const req = await api.post<IChannelMember>("/channels/join", { channelId });
  return req.data;
}

export async function leaveChannel(channelId: string): Promise<void> {
  await api.post("/channels/leave", { channelId });
}

export async function getChannelMembers(
  channelId: string,
): Promise<IChannelMember[]> {
  const req = await api.post<IChannelMember[]>("/channels/members", {
    channelId,
  });
  return req.data;
}

export async function addChannelMember(data: {
  channelId: string;
  userId: string;
}): Promise<IChannelMember> {
  const req = await api.post<IChannelMember>("/channels/members/add", data);
  return req.data;
}

export async function removeChannelMember(data: {
  channelId: string;
  userId: string;
}): Promise<void> {
  await api.post("/channels/members/remove", data);
}

export async function updateChannelMemberSettings(data: {
  channelId: string;
  notifyLevel?: string;
  muted?: boolean;
}): Promise<IChannelMember> {
  const req = await api.post<IChannelMember>(
    "/channels/members/settings",
    data,
  );
  return req.data;
}

export async function markChannelRead(data: {
  channelId: string;
  messageId: string;
}): Promise<void> {
  await api.post("/channels/read", data);
}

export async function getUnreadCounts(): Promise<IUnreadCount[]> {
  const req = await api.post<IUnreadCount[]>("/channels/unread-counts");
  return req.data;
}
