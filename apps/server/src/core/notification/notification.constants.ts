export const NotificationType = {
  COMMENT_USER_MENTION: 'comment.user_mention',
  COMMENT_CREATED: 'comment.created',
  COMMENT_RESOLVED: 'comment.resolved',
  PAGE_USER_MENTION: 'page.user_mention',
  PAGE_PERMISSION_GRANTED: 'page.permission_granted',
  PAGE_UPDATED: 'page.updated',
  PAGE_VERIFICATION_EXPIRING: 'page.verification_expiring',
  PAGE_VERIFICATION_EXPIRED: 'page.verification_expired',
  PAGE_VERIFIED: 'page.verified',
  PAGE_APPROVAL_REQUESTED: 'page.approval_requested',
  PAGE_APPROVAL_REJECTED: 'page.approval_rejected',
  CHAT_MENTION: 'chat.mention',
  CHAT_DIRECT_MESSAGE: 'chat.direct_message',
  CALENDAR_EVENT_INVITE: 'calendar.event_invite',
  CALENDAR_EVENT_UPDATED: 'calendar.event_updated',
  CALENDAR_EVENT_CANCELLED: 'calendar.event_cancelled',
  CALENDAR_EVENT_RESPONSE: 'calendar.event_response',
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

export type NotificationSettingKey =
  | 'page.updated'
  | 'page.userMention'
  | 'comment.userMention'
  | 'comment.created'
  | 'comment.resolved'
  | 'chat.mention'
  | 'chat.directMessage'
  | 'calendar.eventInvite';

export const NotificationTypeToSettingKey: Partial<
  Record<NotificationType, NotificationSettingKey>
> = {
  [NotificationType.PAGE_UPDATED]: 'page.updated',
  [NotificationType.PAGE_USER_MENTION]: 'page.userMention',
  [NotificationType.COMMENT_USER_MENTION]: 'comment.userMention',
  [NotificationType.COMMENT_CREATED]: 'comment.created',
  [NotificationType.COMMENT_RESOLVED]: 'comment.resolved',
  [NotificationType.CHAT_MENTION]: 'chat.mention',
  [NotificationType.CHAT_DIRECT_MESSAGE]: 'chat.directMessage',
  [NotificationType.CALENDAR_EVENT_INVITE]: 'calendar.eventInvite',
  [NotificationType.CALENDAR_EVENT_UPDATED]: 'calendar.eventInvite',
  [NotificationType.CALENDAR_EVENT_CANCELLED]: 'calendar.eventInvite',
  [NotificationType.CALENDAR_EVENT_RESPONSE]: 'calendar.eventInvite',
};

export type NotificationTab = 'direct' | 'updates' | 'all';

export const DIRECT_NOTIFICATION_TYPES: NotificationType[] = [
  NotificationType.COMMENT_USER_MENTION,
  NotificationType.COMMENT_CREATED,
  NotificationType.COMMENT_RESOLVED,
  NotificationType.PAGE_USER_MENTION,
  NotificationType.PAGE_PERMISSION_GRANTED,
  NotificationType.CHAT_MENTION,
  NotificationType.CHAT_DIRECT_MESSAGE,
  NotificationType.CALENDAR_EVENT_INVITE,
  NotificationType.CALENDAR_EVENT_UPDATED,
  NotificationType.CALENDAR_EVENT_CANCELLED,
  NotificationType.CALENDAR_EVENT_RESPONSE,
];

export const UPDATES_NOTIFICATION_TYPES: NotificationType[] = [
  NotificationType.PAGE_UPDATED,
];

export function getTypesForTab(tab: NotificationTab): NotificationType[] | undefined {
  if (tab === 'direct') return DIRECT_NOTIFICATION_TYPES;
  if (tab === 'updates') return UPDATES_NOTIFICATION_TYPES;
  return undefined;
}
