export const ChatWsEvent = {
  MESSAGE_CREATED: "message.created",
  MESSAGE_UPDATED: "message.updated",
  MESSAGE_DELETED: "message.deleted",
  REACTION_UPDATED: "reaction.updated",
  TYPING: "typing",
  PRESENCE: "presence",
  CHANNEL_CREATED: "channel.created",
  CHANNEL_UPDATED: "channel.updated",
  CHANNEL_ARCHIVED: "channel.archived",
  CHANNEL_MEMBER_ADDED: "channel.member.added",
  CHANNEL_MEMBER_REMOVED: "channel.member.removed",
  CHANNEL_READ: "channel.read",
  TEAM_MEMBER_ADDED: "team.member.added",
  TEAM_MEMBER_REMOVED: "team.member.removed",
  CALL_STARTED: "call.started",
  CALL_ENDED: "call.ended",
  CALL_PARTICIPANT_JOINED: "call.participant.joined",
  CALL_PARTICIPANT_LEFT: "call.participant.left",
  CALL_PARTICIPANT_UPDATED: "call.participant.updated",
  CALENDAR_EVENT_CREATED: "calendar.event.created",
  CALENDAR_EVENT_UPDATED: "calendar.event.updated",
  CALENDAR_EVENT_CANCELLED: "calendar.event.cancelled",
  CALENDAR_EVENT_RESPONSE_UPDATED: "calendar.event.response.updated",
} as const;

export type ChatWsEventName = (typeof ChatWsEvent)[keyof typeof ChatWsEvent];

export const CHAT_EVENT = "chat";

export interface ChatWsMessage {
  operation: ChatWsEventName;
  channelId?: string;
  teamId?: string;
  callId?: string;
  payload: any;
}
