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
export type ProjectTaskStatus = string;
export type ProjectTaskPriority = "low" | "medium" | "high" | "urgent";
export type ProjectIssueType = "task" | "bug" | "story" | "epic";

export interface IProjectStatus {
  id: string;
  label: string;
  color: string;
  isDone: boolean;
}

export interface ISprint {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  active?: boolean;
}

export const DEFAULT_PROJECT_STATUSES: IProjectStatus[] = [
  { id: "todo", label: "To Do", color: "gray", isDone: false },
  { id: "in_progress", label: "In Progress", color: "blue", isDone: false },
  { id: "blocked", label: "Blocked", color: "red", isDone: false },
  { id: "done", label: "Done", color: "green", isDone: true },
];

export interface ITeamProject {
  id: string;
  workspaceId: string;
  teamId: string;
  name: string;
  description: string | null;
  view: ProjectView;
  statuses?: IProjectStatus[];
  sprints?: ISprint[];
  logoUrl?: string | null;
  projectTags?: string[];
  createdById: string | null;
  taskCount?: number;
  doneTaskCount?: number;
  teamName?: string;
  teamSlug?: string;
  memberRole?: TeamMemberRole;
  createdAt: string;
  updatedAt: string;
}

export interface ITaskAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  type: string;
}

export interface ITeamProjectTask {
  id: string;
  workspaceId: string;
  teamId: string;
  projectId: string;
  title: string;
  description: string | null;
  issueType: ProjectIssueType;
  tags: string[];
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  assigneeId: string | null;
  assignee?: IChatUser | null;
  sprint: string | null;
  storyPoints: number | null;
  externalLinks: string[];
  dueAt: string | null;
  sortOrder: number;
  parentTaskId: string | null;
  linkedTaskIds: string[];
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: ITaskAttachment[] | null;
  subtasks?: ITeamProjectTask[];
}

export interface ITeamProjectTaskComment {
  id: string;
  workspaceId: string;
  teamId: string;
  projectId: string;
  taskId: string;
  userId: string | null;
  content: string;
  user?: IChatUser | null;
  createdAt: string;
  updatedAt: string;
}

export interface ITeamGroup {
  id: string;
  teamId: string;
  groupId: string;
  role: TeamMemberRole;
  name: string;
  description?: string | null;
  createdAt: string;
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
