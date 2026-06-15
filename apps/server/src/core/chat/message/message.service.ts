import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { MessageRepo } from '@docmost/db/repos/chat/message.repo';
import { ChannelRepo } from '@docmost/db/repos/chat/channel.repo';
import { ChannelMemberRepo } from '@docmost/db/repos/chat/channel-member.repo';
import { TeamMemberRepo } from '@docmost/db/repos/chat/team-member.repo';
import { MessageMentionRepo } from '@docmost/db/repos/chat/message-mention.repo';
import { MessageAttachmentRepo } from '@docmost/db/repos/chat/message-attachment.repo';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { executeTx } from '@docmost/db/utils';
import { Message, User, Workspace } from '@docmost/db/types/entity.types';
import { ChatWsService } from '../../../ws/chat-ws.service';
import { ChatWsEvent } from '../../../ws/chat-ws.constants';
import { ChatNotificationService } from '../../notification/services/chat.notification';
import {
  WebhookEvents,
  WebhookService,
} from '../../../integrations/webhook/webhook.service';
import {
  GetChannelMessagesDto,
  GetThreadMessagesDto,
  SendMessageDto,
  UpdateMessageDto,
} from './dto/message.dto';

@Injectable()
export class MessageService {
  constructor(
    private readonly messageRepo: MessageRepo,
    private readonly channelRepo: ChannelRepo,
    private readonly channelMemberRepo: ChannelMemberRepo,
    private readonly teamMemberRepo: TeamMemberRepo,
    private readonly messageMentionRepo: MessageMentionRepo,
    private readonly messageAttachmentRepo: MessageAttachmentRepo,
    private readonly chatWsService: ChatWsService,
    private readonly chatNotificationService: ChatNotificationService,
    private readonly webhookService: WebhookService,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async getChannelMessages(
    dto: GetChannelMessagesDto,
    user: User,
    workspace: Workspace,
  ) {
    await this.assertChannelMember(dto.channelId, user.id, workspace.id);

    return this.messageRepo.getChannelMessages(dto.channelId, dto);
  }

  async getThreadMessages(
    dto: GetThreadMessagesDto,
    user: User,
    workspace: Workspace,
  ) {
    const rootMessage = await this.messageRepo.findById(
      dto.rootId,
      workspace.id,
    );
    if (!rootMessage) {
      throw new NotFoundException('Message not found');
    }

    await this.assertChannelMember(
      rootMessage.channelId,
      user.id,
      workspace.id,
    );

    return this.messageRepo.getThreadMessages(dto.rootId, dto);
  }

  async getMessageById(messageId: string, user: User, workspace: Workspace) {
    const message = await this.messageRepo.findById(messageId, workspace.id);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.assertChannelMember(message.channelId, user.id, workspace.id);

    return this.messageRepo.getMessageWithRelations(messageId, workspace.id);
  }

  async sendMessage(
    dto: SendMessageDto,
    user: User,
    workspace: Workspace,
  ): Promise<any> {
    await this.assertChannelMember(dto.channelId, user.id, workspace.id);

    const hasContent = !!dto.content?.trim();
    const hasAttachments = !!dto.attachmentIds?.length;

    if (!hasContent && !hasAttachments) {
      throw new BadRequestException('Message must have content or attachments');
    }

    let rootId: string | null = null;
    if (dto.rootId) {
      const rootMessage = await this.messageRepo.findById(
        dto.rootId,
        workspace.id,
      );
      if (!rootMessage || rootMessage.channelId !== dto.channelId) {
        throw new NotFoundException('Thread message not found');
      }
      rootId = rootMessage.rootId ?? rootMessage.id;
    }

    let message: Message;
    let mentionedUserIds: string[] = [];
    await executeTx(this.db, async (trx) => {
      message = await this.messageRepo.insertMessage(
        {
          workspaceId: workspace.id,
          channelId: dto.channelId,
          userId: user.id,
          rootId,
          content: dto.content ?? null,
          type: 'default',
        },
        trx,
      );

      if (dto.attachmentIds?.length) {
        await this.messageAttachmentRepo.insertMessageAttachments(
          message.id,
          dto.attachmentIds,
          trx,
        );
      }

      if (dto.mentionUserIds?.length) {
        mentionedUserIds = await this.filterChannelMembers(
          dto.channelId,
          dto.mentionUserIds,
        );
        await this.messageMentionRepo.insertMentions(
          message.id,
          mentionedUserIds,
          trx,
        );
      }

      await this.channelRepo.updateLastPostAt(dto.channelId, new Date(), trx);
    });

    const fullMessage = await this.messageRepo.getMessageWithRelations(
      message.id,
      workspace.id,
    );

    this.chatWsService.emitToChannel(
      dto.channelId,
      ChatWsEvent.MESSAGE_CREATED,
      fullMessage,
    );

    this.chatNotificationService
      .notifyNewMessage(
        {
          messageId: message.id,
          channelId: dto.channelId,
          workspaceId: workspace.id,
          actorId: user.id,
          content: dto.content ?? null,
        },
        mentionedUserIds,
      )
      .catch(() => {});

    this.webhookService
      .enqueue(workspace.id, WebhookEvents.CHAT_MESSAGE_CREATED, {
        message: fullMessage,
        channelId: dto.channelId,
        actorId: user.id,
      })
      .catch(() => {});

    return fullMessage;
  }

  async updateMessage(
    dto: UpdateMessageDto,
    user: User,
    workspace: Workspace,
  ) {
    const message = await this.messageRepo.findById(
      dto.messageId,
      workspace.id,
    );
    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }

    if (message.userId !== user.id) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    await this.messageRepo.updateMessage(
      { content: dto.content, editedAt: new Date() },
      dto.messageId,
      workspace.id,
    );

    const updated = await this.messageRepo.getMessageWithRelations(
      dto.messageId,
      workspace.id,
    );

    this.chatWsService.emitToChannel(
      message.channelId,
      ChatWsEvent.MESSAGE_UPDATED,
      updated,
    );

    return updated;
  }

  async deleteMessage(
    messageId: string,
    user: User,
    workspace: Workspace,
  ): Promise<Message> {
    const message = await this.messageRepo.findById(messageId, workspace.id);
    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }

    if (message.userId !== user.id) {
      const member = await this.channelMemberRepo.getChannelMember(
        message.channelId,
        user.id,
      );
      if (!member || member.role !== 'admin') {
        throw new ForbiddenException('You can only delete your own messages');
      }
    }

    await this.messageRepo.softDeleteMessage(messageId, workspace.id);

    this.chatWsService.emitToChannel(
      message.channelId,
      ChatWsEvent.MESSAGE_DELETED,
      { messageId, channelId: message.channelId, rootId: message.rootId },
    );

    return message;
  }

  private async filterChannelMembers(
    channelId: string,
    userIds: string[],
  ): Promise<string[]> {
    const members = await this.channelMemberRepo.getChannelMembers(channelId);
    const memberIds = new Set(members.map((member) => member.userId));
    return userIds.filter((userId) => memberIds.has(userId));
  }

  private async assertChannelMember(
    channelId: string,
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    const channel = await this.channelRepo.findById(channelId, workspaceId);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const member = await this.channelMemberRepo.getChannelMember(
      channelId,
      userId,
    );
    if (member) {
      return;
    }

    if (channel.type === 'public' && channel.teamId) {
      const teamMember = await this.teamMemberRepo.getTeamMember(
        channel.teamId,
        userId,
      );
      if (teamMember) {
        await this.channelMemberRepo.ensureChannelMember({
          channelId,
          userId,
          role: 'member',
        });
        return;
      }
    }

    throw new ForbiddenException('You do not have access to this channel');
  }
}
