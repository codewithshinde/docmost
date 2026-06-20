import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageRepo } from '@docmost/db/repos/chat/message.repo';
import { ChannelMemberRepo } from '@docmost/db/repos/chat/channel-member.repo';
import { MessageReactionRepo } from '@docmost/db/repos/chat/message-reaction.repo';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { ChatWsService } from '../../../ws/chat-ws.service';
import { ChatWsEvent } from '../../../ws/chat-ws.constants';
import { AddReactionDto, RemoveReactionDto } from './dto/reaction.dto';

@Injectable()
export class ReactionService {
  constructor(
    private readonly messageRepo: MessageRepo,
    private readonly channelMemberRepo: ChannelMemberRepo,
    private readonly messageReactionRepo: MessageReactionRepo,
    private readonly chatWsService: ChatWsService,
  ) {}

  async addReaction(dto: AddReactionDto, user: User, workspace: Workspace) {
    const message = await this.assertAccessibleMessage(
      dto.messageId,
      user.id,
      workspace.id,
    );

    await this.messageReactionRepo.addReaction({
      messageId: message.id,
      userId: user.id,
      emoji: dto.emoji,
    });

    const reactions = await this.messageReactionRepo.getReactionsForMessage(
      message.id,
    );

    this.chatWsService.emitToChannel(
      message.channelId,
      ChatWsEvent.REACTION_UPDATED,
      { messageId: message.id, channelId: message.channelId, reactions },
    );

    return reactions;
  }

  async removeReaction(
    dto: RemoveReactionDto,
    user: User,
    workspace: Workspace,
  ) {
    const message = await this.assertAccessibleMessage(
      dto.messageId,
      user.id,
      workspace.id,
    );

    await this.messageReactionRepo.removeReaction(
      message.id,
      user.id,
      dto.emoji,
    );

    const reactions = await this.messageReactionRepo.getReactionsForMessage(
      message.id,
    );

    this.chatWsService.emitToChannel(
      message.channelId,
      ChatWsEvent.REACTION_UPDATED,
      { messageId: message.id, channelId: message.channelId, reactions },
    );

    return reactions;
  }

  private async assertAccessibleMessage(
    messageId: string,
    userId: string,
    workspaceId: string,
  ) {
    const message = await this.messageRepo.findById(messageId, workspaceId);
    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }

    const member = await this.channelMemberRepo.getChannelMember(
      message.channelId,
      userId,
    );
    if (!member) {
      throw new ForbiddenException('You do not have access to this channel');
    }

    return message;
  }
}
