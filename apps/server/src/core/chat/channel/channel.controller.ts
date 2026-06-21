import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ChannelService } from './channel.service';
import {
  AddChannelMemberDto,
  ChannelIdDto,
  CreateChannelDto,
  CreateDirectChannelDto,
  MarkChannelReadDto,
  RemoveChannelMemberDto,
  TeamChannelsDto,
  UpdateChannelDto,
  UpdateChannelMemberSettingsDto,
} from './dto/channel.dto';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@likh/db/types/entity.types';

@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @HttpCode(HttpStatus.OK)
  @Post('team')
  async getTeamChannels(
    @Body() dto: TeamChannelsDto,
    @AuthUser() user: User,
  ) {
    return this.channelService.getTeamChannels(dto.teamId, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('direct')
  async getDirectChannels(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.channelService.getDirectChannels(user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('info')
  async getChannelById(
    @Body() dto: ChannelIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.channelService.getChannelById(dto.channelId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  async createChannel(
    @Body() dto: CreateChannelDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.channelService.createChannel(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create-direct')
  async createDirectChannel(
    @Body() dto: CreateDirectChannelDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.channelService.createDirectChannel(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async updateChannel(
    @Body() dto: UpdateChannelDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.channelService.updateChannel(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('archive')
  async archiveChannel(
    @Body() dto: ChannelIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    await this.channelService.archiveChannel(dto.channelId, user, workspace);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('join')
  async joinChannel(
    @Body() dto: ChannelIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.channelService.joinChannel(dto.channelId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('leave')
  async leaveChannel(
    @Body() dto: ChannelIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    await this.channelService.leaveChannel(dto.channelId, user, workspace);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('members')
  async getChannelMembers(
    @Body() dto: ChannelIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.channelService.getChannelMembers(dto.channelId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('members/add')
  async addChannelMember(
    @Body() dto: AddChannelMemberDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.channelService.addChannelMember(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('members/remove')
  async removeChannelMember(
    @Body() dto: RemoveChannelMemberDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    await this.channelService.removeChannelMember(dto, user, workspace);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('members/settings')
  async updateChannelMemberSettings(
    @Body() dto: UpdateChannelMemberSettingsDto,
    @AuthUser() user: User,
  ) {
    return this.channelService.updateChannelMemberSettings(dto, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('read')
  async markChannelRead(@Body() dto: MarkChannelReadDto, @AuthUser() user: User) {
    await this.channelService.markChannelRead(dto, user);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('unread-counts')
  async getUnreadCounts(@AuthUser() user: User) {
    return this.channelService.getUnreadCounts(user);
  }
}
