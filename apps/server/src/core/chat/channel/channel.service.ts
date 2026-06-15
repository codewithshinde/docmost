import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { ChannelRepo } from '@docmost/db/repos/chat/channel.repo';
import { ChannelMemberRepo } from '@docmost/db/repos/chat/channel-member.repo';
import { TeamMemberRepo } from '@docmost/db/repos/chat/team-member.repo';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { executeTx } from '@docmost/db/utils';
import {
  Channel,
  ChannelMember,
  User,
  Workspace,
} from '@docmost/db/types/entity.types';
import { slugify } from '../../../common/helpers/slug.utils';
import { nanoIdGen } from '../../../common/helpers/nanoid.utils';
import { ChatWsService } from '../../../ws/chat-ws.service';
import { ChatWsEvent } from '../../../ws/chat-ws.constants';
import {
  AddChannelMemberDto,
  CreateChannelDto,
  CreateDirectChannelDto,
  MarkChannelReadDto,
  RemoveChannelMemberDto,
  UpdateChannelDto,
  UpdateChannelMemberSettingsDto,
} from './dto/channel.dto';

@Injectable()
export class ChannelService {
  constructor(
    private readonly channelRepo: ChannelRepo,
    private readonly channelMemberRepo: ChannelMemberRepo,
    private readonly teamMemberRepo: TeamMemberRepo,
    private readonly userRepo: UserRepo,
    private readonly chatWsService: ChatWsService,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async getTeamChannels(teamId: string, user: User) {
    await this.assertTeamMember(teamId, user.id);
    return this.channelRepo.getTeamChannels(teamId, user.id);
  }

  async getDirectChannels(user: User, workspace: Workspace) {
    return this.channelRepo.getDirectChannelsForUser(user.id, workspace.id);
  }

  async getChannelById(
    channelId: string,
    user: User,
    workspace: Workspace,
  ): Promise<Channel> {
    const channel = await this.channelRepo.findById(channelId, workspace.id);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    await this.assertChannelAccess(channel, user.id);

    return channel;
  }

  async createChannel(
    dto: CreateChannelDto,
    user: User,
    workspace: Workspace,
  ): Promise<Channel> {
    await this.assertTeamMember(dto.teamId, user.id);

    const slug = await this.generateUniqueSlug(dto.name, dto.teamId);

    let channel: Channel;
    await executeTx(this.db, async (trx) => {
      channel = await this.channelRepo.insertChannel(
        {
          workspaceId: workspace.id,
          teamId: dto.teamId,
          name: dto.name,
          slug,
          topic: dto.topic,
          purpose: dto.purpose,
          type: dto.type ?? 'public',
          createdById: user.id,
        },
        trx,
      );

      await this.channelMemberRepo.ensureChannelMember(
        {
          channelId: channel.id,
          userId: user.id,
          role: 'admin',
        },
        trx,
      );

      if ((dto.type ?? 'public') === 'public') {
        const teamMembers = await this.teamMemberRepo.getTeamMembers(dto.teamId);
        for (const teamMember of teamMembers) {
          await this.channelMemberRepo.ensureChannelMember(
            {
              channelId: channel.id,
              userId: teamMember.userId,
              role: teamMember.userId === user.id ? 'admin' : 'member',
            },
            trx,
          );
        }
      }
    });

    await this.chatWsService.addUserToChannel(user.id, channel.id);

    if (channel.type === 'public') {
      this.chatWsService.emitToTeam(
        dto.teamId,
        ChatWsEvent.CHANNEL_CREATED,
        channel,
      );
    }

    return channel;
  }

  async createDirectChannel(
    dto: CreateDirectChannelDto,
    user: User,
    workspace: Workspace,
  ): Promise<Channel> {
    const participantIds = Array.from(new Set([user.id, ...dto.userIds]));

    for (const userId of participantIds) {
      if (userId === user.id) continue;
      const targetUser = await this.userRepo.findById(userId, workspace.id);
      if (!targetUser) {
        throw new NotFoundException(`User ${userId} not found`);
      }
    }

    const type = participantIds.length > 2 ? 'group_dm' : 'dm';

    const existing = await this.channelRepo.findDirectChannel(
      workspace.id,
      participantIds,
      type,
    );
    if (existing) {
      return existing;
    }

    let channel: Channel;
    await executeTx(this.db, async (trx) => {
      channel = await this.channelRepo.insertChannel(
        {
          workspaceId: workspace.id,
          teamId: null,
          name: null,
          slug: null,
          type,
          createdById: user.id,
        },
        trx,
      );

      for (const userId of participantIds) {
        await this.channelMemberRepo.insertChannelMember(
          {
            channelId: channel.id,
            userId,
            role: 'member',
          },
          trx,
        );
      }
    });

    await Promise.all(
      participantIds.map((userId) =>
        this.chatWsService.addUserToChannel(userId, channel.id),
      ),
    );
    this.chatWsService.emitToUsers(
      participantIds,
      ChatWsEvent.CHANNEL_CREATED,
      channel,
    );

    return channel;
  }

  async updateChannel(
    dto: UpdateChannelDto,
    user: User,
    workspace: Workspace,
  ): Promise<Channel> {
    const channel = await this.getChannelOrThrow(dto.channelId, workspace.id);
    await this.assertChannelAdmin(channel, user.id);

    const updated = await this.channelRepo.updateChannel(
      {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.topic !== undefined && { topic: dto.topic }),
        ...(dto.purpose !== undefined && { purpose: dto.purpose }),
      },
      dto.channelId,
      workspace.id,
    );

    this.chatWsService.emitToChannel(
      dto.channelId,
      ChatWsEvent.CHANNEL_UPDATED,
      updated,
    );

    return updated;
  }

  async archiveChannel(
    channelId: string,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    const channel = await this.getChannelOrThrow(channelId, workspace.id);
    await this.assertChannelAdmin(channel, user.id);

    await this.channelRepo.archiveChannel(channelId, workspace.id);

    this.chatWsService.emitToChannel(channelId, ChatWsEvent.CHANNEL_ARCHIVED, {
      channelId,
    });
  }

  async joinChannel(
    channelId: string,
    user: User,
    workspace: Workspace,
  ): Promise<ChannelMember> {
    const channel = await this.getChannelOrThrow(channelId, workspace.id);

    if (channel.type !== 'public') {
      throw new ForbiddenException('This channel requires an invitation to join');
    }

    await this.assertTeamMember(channel.teamId, user.id);

    const member = await this.channelMemberRepo.ensureChannelMember({
      channelId,
      userId: user.id,
      role: 'member',
    });

    await this.chatWsService.addUserToChannel(user.id, channelId);
    this.chatWsService.emitToChannel(
      channelId,
      ChatWsEvent.CHANNEL_MEMBER_ADDED,
      member,
    );

    return member;
  }

  async leaveChannel(channelId: string, user: User, workspace: Workspace): Promise<void> {
    const channel = await this.getChannelOrThrow(channelId, workspace.id);

    const member = await this.channelMemberRepo.getChannelMember(
      channelId,
      user.id,
    );
    if (!member) {
      throw new NotFoundException('Channel member not found');
    }

    if (channel.type === 'dm' || channel.type === 'group_dm') {
      throw new BadRequestException('You cannot leave a direct message channel');
    }

    await this.channelMemberRepo.removeChannelMember(channelId, user.id);

    await this.chatWsService.removeUserFromChannel(user.id, channelId);
    this.chatWsService.emitToChannel(
      channelId,
      ChatWsEvent.CHANNEL_MEMBER_REMOVED,
      { channelId, userId: user.id },
    );
  }

  async getChannelMembers(channelId: string, user: User, workspace: Workspace) {
    const channel = await this.getChannelOrThrow(channelId, workspace.id);
    await this.assertChannelAccess(channel, user.id);

    return this.channelMemberRepo.getChannelMembers(channelId);
  }

  async addChannelMember(
    dto: AddChannelMemberDto,
    user: User,
    workspace: Workspace,
  ): Promise<ChannelMember> {
    const channel = await this.getChannelOrThrow(dto.channelId, workspace.id);
    await this.assertChannelAdmin(channel, user.id);

    const targetUser = await this.userRepo.findById(dto.userId, workspace.id);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (channel.teamId) {
      await this.assertTeamMember(channel.teamId, dto.userId);
    }

    const existing = await this.channelMemberRepo.getChannelMember(
      dto.channelId,
      dto.userId,
    );
    if (existing) {
      throw new BadRequestException('User is already a member of this channel');
    }

    const member = await this.channelMemberRepo.insertChannelMember({
      channelId: dto.channelId,
      userId: dto.userId,
      role: 'member',
    });

    await this.chatWsService.addUserToChannel(dto.userId, dto.channelId);
    this.chatWsService.emitToChannel(
      dto.channelId,
      ChatWsEvent.CHANNEL_MEMBER_ADDED,
      member,
    );

    return member;
  }

  async removeChannelMember(
    dto: RemoveChannelMemberDto,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    const channel = await this.getChannelOrThrow(dto.channelId, workspace.id);

    if (channel.type === 'dm' || channel.type === 'group_dm') {
      throw new BadRequestException(
        'Members cannot be removed from a direct message channel',
      );
    }

    const isSelf = dto.userId === user.id;
    if (!isSelf) {
      await this.assertChannelAdmin(channel, user.id);
    }

    const member = await this.channelMemberRepo.getChannelMember(
      dto.channelId,
      dto.userId,
    );
    if (!member) {
      throw new NotFoundException('Channel member not found');
    }

    await this.channelMemberRepo.removeChannelMember(dto.channelId, dto.userId);

    await this.chatWsService.removeUserFromChannel(dto.userId, dto.channelId);
    this.chatWsService.emitToChannel(
      dto.channelId,
      ChatWsEvent.CHANNEL_MEMBER_REMOVED,
      { channelId: dto.channelId, userId: dto.userId },
    );
  }

  async updateChannelMemberSettings(
    dto: UpdateChannelMemberSettingsDto,
    user: User,
  ): Promise<ChannelMember> {
    const member = await this.channelMemberRepo.getChannelMember(
      dto.channelId,
      user.id,
    );
    if (!member) {
      throw new NotFoundException('Channel member not found');
    }

    return this.channelMemberRepo.updateChannelMember(
      {
        ...(dto.notifyLevel !== undefined && { notifyLevel: dto.notifyLevel }),
        ...(dto.muted !== undefined && { muted: dto.muted }),
      },
      dto.channelId,
      user.id,
    );
  }

  async markChannelRead(dto: MarkChannelReadDto, user: User): Promise<void> {
    const member = await this.channelMemberRepo.getChannelMember(
      dto.channelId,
      user.id,
    );
    if (!member) {
      throw new NotFoundException('Channel member not found');
    }

    await this.channelMemberRepo.markRead(
      dto.channelId,
      user.id,
      dto.messageId,
    );

    this.chatWsService.emitToUsers([user.id], ChatWsEvent.CHANNEL_READ, {
      channelId: dto.channelId,
      messageId: dto.messageId,
    });
  }

  async getUnreadCounts(user: User) {
    return this.channelMemberRepo.getUnreadCounts(user.id);
  }

  private async generateUniqueSlug(name: string, teamId: string): Promise<string> {
    const base = slugify(name) || 'channel';
    let slug = base;

    while (await this.channelRepo.slugExistsInTeam(slug, teamId)) {
      slug = `${base}-${nanoIdGen(6)}`;
    }

    return slug;
  }

  private async getChannelOrThrow(
    channelId: string,
    workspaceId: string,
  ): Promise<Channel> {
    const channel = await this.channelRepo.findById(channelId, workspaceId);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    return channel;
  }

  private async assertTeamMember(teamId: string, userId: string): Promise<void> {
    const member = await this.teamMemberRepo.getTeamMember(teamId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this team');
    }
  }

  private async assertChannelAccess(channel: Channel, userId: string): Promise<void> {
    if (channel.type === 'public' && channel.teamId) {
      await this.assertTeamMember(channel.teamId, userId);
      return;
    }

    const member = await this.channelMemberRepo.getChannelMember(
      channel.id,
      userId,
    );
    if (!member) {
      throw new ForbiddenException('You do not have access to this channel');
    }
  }

  private async assertChannelAdmin(channel: Channel, userId: string): Promise<ChannelMember> {
    const member = await this.channelMemberRepo.getChannelMember(
      channel.id,
      userId,
    );
    if (!member) {
      throw new ForbiddenException('You are not a member of this channel');
    }

    if (member.role !== 'admin') {
      throw new ForbiddenException('Only channel admins can perform this action');
    }

    return member;
  }
}
