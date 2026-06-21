import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { MessageService } from './message.service';
import {
  GetChannelMessagesDto,
  GetThreadMessagesDto,
  MessageIdDto,
  SendMessageDto,
  UpdateMessageDto,
} from './dto/message.dto';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@likh/db/types/entity.types';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @HttpCode(HttpStatus.OK)
  @Post('/')
  async getChannelMessages(
    @Body() dto: GetChannelMessagesDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.messageService.getChannelMessages(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('thread')
  async getThreadMessages(
    @Body() dto: GetThreadMessagesDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.messageService.getThreadMessages(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('info')
  async getMessageById(
    @Body() dto: MessageIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.messageService.getMessageById(dto.messageId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('send')
  async sendMessage(
    @Body() dto: SendMessageDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.messageService.sendMessage(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async updateMessage(
    @Body() dto: UpdateMessageDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.messageService.updateMessage(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async deleteMessage(
    @Body() dto: MessageIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.messageService.deleteMessage(dto.messageId, user, workspace);
  }
}
