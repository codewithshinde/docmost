export interface IChatUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export type ChannelType = "public" | "private" | "dm" | "group_dm";
export type TeamMemberRole = "owner" | "member";
export type ChannelMemberRole = "admin" | "member";
export type ChannelNotifyLevel = "all" | "mentions" | "none";

export interface ITeam {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  createdById: string | null;
  memberRole?: TeamMemberRole;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ITeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  user?: IChatUser;
  createdAt: string;
}

export type ProjectView = "table" | "kanban" | "calendar";
export type ProjectTaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type ProjectTaskPriority = "low" | "medium" | "high" | "urgent";

export interface ITeamProject {
  id: string;
  workspaceId: string;
  teamId: string;
  name: string;
  description: string | null;
  view: ProjectView;
  createdById: string | null;
  taskCount?: number;
  doneTaskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ITeamProjectTask {
  id: string;
  workspaceId: string;
  teamId: string;
  projectId: string;
  title: string;
  description: string | null;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  assigneeId: string | null;
  assignee?: IChatUser | null;
  dueAt: string | null;
  sortOrder: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IChannel {
  id: string;
  workspaceId: string;
  teamId: string | null;
  name: string | null;
  slug: string | null;
  topic: string | null;
  purpose: string | null;
  type: ChannelType;
  createdById: string | null;
  lastPostAt: string | null;
  memberCount?: number;
  members?: IChatUser[];
  createdAt: string;
  updatedAt: string;
}

export interface IChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: ChannelMemberRole;
  notifyLevel: ChannelNotifyLevel;
  muted: boolean;
  lastReadAt: string | null;
  lastReadMessageId: string | null;
  user?: IChatUser;
  createdAt: string;
}

export interface IMessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  type: string;
}

export interface IMessageReaction {
  emoji: string;
  userId: string;
}

export interface IMessage {
  id: string;
  workspaceId: string;
  channelId: string;
  userId: string | null;
  rootId: string | null;
  content: string | null;
  type: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: IChatUser;
  reactions?: IMessageReaction[];
  attachments?: IMessageAttachment[];
  replyCount?: number;
}

export interface IUnreadCount {
  channelId: string;
  unreadCount: number;
}

export interface IUploadedAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  type: string;
}

export interface ICallParticipant {
  userId: string;
  screenSharing?: boolean;
}

export interface ICall {
  id: string;
  workspaceId: string;
  channelId: string;
  startedById: string | null;
  status: "active" | "ended";
  provider: string;
  roomName: string;
  startedAt?: string;
  endedAt?: string | null;
  participants?: ICallParticipant[];
}

export type CallProvider = "livekit" | "jitsi";

export interface ICallConfig {
  provider: CallProvider;
  enabled: boolean;
  configured: boolean;
  livekitUrl: string | null;
  jitsiDomain: string | null;
}

export interface IJoinCallResponse {
  call: ICall;
  provider: CallProvider;
  token: string | null;
  livekitUrl: string | null;
  jitsiDomain: string | null;
}
