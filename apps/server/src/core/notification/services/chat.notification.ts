import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { NotificationService } from '../notification.service';
import { NotificationType } from '../notification.constants';
import { WebPushService } from '../../../integrations/webpush/webpush.service';
import { ChannelMemberRepo } from '@docmost/db/repos/chat/channel-member.repo';

const MESSAGE_PREVIEW_LENGTH = 140;

interface ChatMessageContext {
  messageId: string;
  channelId: string;
  workspaceId: string;
  actorId: string;
  content: string | null;
}

@Injectable()
export class ChatNotificationService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly notificationService: NotificationService,
    private readonly webPushService: WebPushService,
    private readonly channelMemberRepo: ChannelMemberRepo,
  ) {}

  async notifyNewMessage(
    context: ChatMessageContext,
    mentionedUserIds: string[],
  ): Promise<void> {
    const channel = await this.db
      .selectFrom('channels')
      .select(['id', 'name', 'type'])
      .where('id', '=', context.channelId)
      .executeTakeFirst();
    if (!channel) return;

    const actor = await this.db
      .selectFrom('users')
      .select(['id', 'name'])
      .where('id', '=', context.actorId)
      .executeTakeFirst();
    if (!actor) return;

    const preview = this.buildPreview(context.content);
    const notifiedUserIds = new Set<string>();

    if (mentionedUserIds.length > 0) {
      await this.notifyMentionedUsers(
        context,
        mentionedUserIds,
        actor.name,
        channel.name,
        preview,
        notifiedUserIds,
      );
    }

    if (channel.type === 'dm' || channel.type === 'group_dm') {
      await this.notifyDirectMessageRecipients(
        context,
        actor.name,
        preview,
        notifiedUserIds,
      );
    }
  }

  private async notifyMentionedUsers(
    context: ChatMessageContext,
    mentionedUserIds: string[],
    actorName: string,
    channelName: string | null,
    preview: string,
    notifiedUserIds: Set<string>,
  ): Promise<void> {
    for (const userId of mentionedUserIds) {
      if (userId === context.actorId || notifiedUserIds.has(userId)) continue;
      notifiedUserIds.add(userId);

      const notification = await this.notificationService.create({
        userId,
        workspaceId: context.workspaceId,
        type: NotificationType.CHAT_MENTION,
        actorId: context.actorId,
        data: { channelId: context.channelId, messageId: context.messageId },
      });
      if (!notification) continue;

      const title = channelName
        ? `${actorName} mentioned you in #${channelName}`
        : `${actorName} mentioned you`;

      await this.webPushService.sendToUser(userId, {
        title,
        body: preview,
        data: { channelId: context.channelId, messageId: context.messageId },
      });
    }
  }

  private async notifyDirectMessageRecipients(
    context: ChatMessageContext,
    actorName: string,
    preview: string,
    notifiedUserIds: Set<string>,
  ): Promise<void> {
    const members = await this.channelMemberRepo.getChannelMembers(
      context.channelId,
    );

    for (const member of members) {
      const userId = member.userId;
      if (
        userId === context.actorId ||
        notifiedUserIds.has(userId) ||
        member.muted
      ) {
        continue;
      }
      notifiedUserIds.add(userId);

      const notification = await this.notificationService.create({
        userId,
        workspaceId: context.workspaceId,
        type: NotificationType.CHAT_DIRECT_MESSAGE,
        actorId: context.actorId,
        data: { channelId: context.channelId, messageId: context.messageId },
      });
      if (!notification) continue;

      await this.webPushService.sendToUser(userId, {
        title: `${actorName} sent you a message`,
        body: preview,
        data: { channelId: context.channelId, messageId: context.messageId },
      });
    }
  }

  private buildPreview(content: string | null): string {
    if (!content) return 'Sent an attachment';
    const trimmed = content.trim();
    if (trimmed.length <= MESSAGE_PREVIEW_LENGTH) return trimmed;
    return `${trimmed.slice(0, MESSAGE_PREVIEW_LENGTH)}...`;
  }
}
