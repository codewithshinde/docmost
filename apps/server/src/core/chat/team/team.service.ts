import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { TeamRepo } from '@likh/db/repos/chat/team.repo';
import { TeamMemberRepo } from '@likh/db/repos/chat/team-member.repo';
import { ChannelRepo } from '@likh/db/repos/chat/channel.repo';
import { ChannelMemberRepo } from '@likh/db/repos/chat/channel-member.repo';
import { GroupRepo } from '@likh/db/repos/group/group.repo';
import { GroupUserRepo } from '@likh/db/repos/group/group-user.repo';
import { UserRepo } from '@likh/db/repos/user/user.repo';
import { KyselyDB } from '@likh/db/types/kysely.types';
import { executeTx } from '@likh/db/utils';
import {
  Team,
  TeamMember,
  User,
  Workspace,
} from '@likh/db/types/entity.types';
import { slugify } from '../../../common/helpers/slug.utils';
import { nanoIdGen } from '../../../common/helpers/nanoid.utils';
import { ChatWsService } from '../../../ws/chat-ws.service';
import { ChatWsEvent } from '../../../ws/chat-ws.constants';
import { SpaceService } from '../../space/services/space.service';
import { SpaceMemberService } from '../../space/services/space-member.service';
import { SpaceRole } from '../../../common/helpers/types/permission';
import {
  AddTeamMemberDto,
  AddTeamGroupDto,
  CreateTeamDto,
  RemoveTeamGroupDto,
  RemoveTeamMemberDto,
  UpdateTeamDto,
  UpdateTeamMemberRoleDto,
} from './dto/team.dto';

@Injectable()
export class TeamService {
  constructor(
    private readonly teamRepo: TeamRepo,
    private readonly teamMemberRepo: TeamMemberRepo,
    private readonly channelRepo: ChannelRepo,
    private readonly channelMemberRepo: ChannelMemberRepo,
    private readonly groupRepo: GroupRepo,
    private readonly groupUserRepo: GroupUserRepo,
    private readonly userRepo: UserRepo,
    private readonly chatWsService: ChatWsService,
    private readonly spaceService: SpaceService,
    private readonly spaceMemberService: SpaceMemberService,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async getUserTeams(user: User, workspace: Workspace) {
    return this.teamRepo.getUserTeams(user.id, workspace.id);
  }

  async getTeamById(
    teamId: string,
    user: User,
    workspace: Workspace,
  ): Promise<Team> {
    const member = await this.assertMember(teamId, user.id);

    const team = await this.teamRepo.findById(teamId, workspace.id, {
      includeMemberCount: true,
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return { ...team, memberRole: member.role } as Team;
  }

  async createTeam(
    dto: CreateTeamDto,
    user: User,
    workspace: Workspace,
  ): Promise<Team> {
    const slug = await this.generateUniqueSlug(dto.name, workspace.id);

    let team: Team;
    await executeTx(this.db, async (trx) => {
      team = await this.teamRepo.insertTeam(
        {
          workspaceId: workspace.id,
          name: dto.name,
          slug,
          description: dto.description,
          type: dto.type ?? 'open',
          createdById: user.id,
        },
        trx,
      );

      await this.teamMemberRepo.insertTeamMember(
        {
          teamId: team.id,
          userId: user.id,
          role: 'owner',
        },
        trx,
      );
    });

    await this.chatWsService.addUserToTeam(user.id, team.id);

    return { ...team, memberCount: 1 } as Team;
  }

  async updateTeam(
    dto: UpdateTeamDto,
    user: User,
    workspace: Workspace,
  ): Promise<Team> {
    await this.assertOwner(dto.teamId, user.id);

    const team = await this.teamRepo.findById(dto.teamId, workspace.id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.teamRepo.updateTeam(
      {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
      },
      dto.teamId,
      workspace.id,
    );
  }

  async deleteTeam(
    teamId: string,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    await this.assertOwner(teamId, user.id);

    const team = await this.teamRepo.findById(teamId, workspace.id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    await this.teamRepo.softDeleteTeam(teamId, workspace.id);
  }

  async getTeamMembers(teamId: string, user: User, workspace: Workspace) {
    await this.assertMember(teamId, user.id);

    const team = await this.teamRepo.findById(teamId, workspace.id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.teamMemberRepo.getTeamMembers(teamId);
  }

  async addTeamMember(
    dto: AddTeamMemberDto,
    user: User,
    workspace: Workspace,
  ): Promise<TeamMember> {
    await this.assertOwner(dto.teamId, user.id);

    const targetUser = await this.userRepo.findById(dto.userId, workspace.id);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existingMember = await this.teamMemberRepo.getTeamMember(
      dto.teamId,
      dto.userId,
    );
    if (existingMember) {
      throw new BadRequestException('User is already a member of this team');
    }

    const member = await this.teamMemberRepo.insertTeamMember({
      teamId: dto.teamId,
      userId: dto.userId,
      role: dto.role ?? 'member',
    });

    await this.chatWsService.addUserToTeam(dto.userId, dto.teamId);
    await this.addUserToLinkedTeamSpaces(dto.userId, dto.teamId, workspace.id);
    await this.addUserToPublicTeamChannels(dto.userId, dto.teamId, workspace.id);
    this.chatWsService.emitToTeam(
      dto.teamId,
      ChatWsEvent.TEAM_MEMBER_ADDED,
      member,
    );

    return member;
  }

  async removeTeamMember(dto: RemoveTeamMemberDto, user: User): Promise<void> {
    const isSelf = dto.userId === user.id;
    if (!isSelf) {
      await this.assertOwner(dto.teamId, user.id);
    } else {
      await this.assertMember(dto.teamId, user.id);
    }

    const member = await this.teamMemberRepo.getTeamMember(
      dto.teamId,
      dto.userId,
    );
    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    if (member.role === 'owner') {
      await this.assertNotLastOwner(dto.teamId);
    }

    await this.teamMemberRepo.removeTeamMember(dto.teamId, dto.userId);

    await this.chatWsService.removeUserFromTeam(dto.userId, dto.teamId);
    this.chatWsService.emitToTeam(dto.teamId, ChatWsEvent.TEAM_MEMBER_REMOVED, {
      teamId: dto.teamId,
      userId: dto.userId,
    });
  }

  async updateTeamMemberRole(
    dto: UpdateTeamMemberRoleDto,
    user: User,
  ): Promise<TeamMember> {
    await this.assertOwner(dto.teamId, user.id);

    const member = await this.teamMemberRepo.getTeamMember(
      dto.teamId,
      dto.userId,
    );
    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    if (member.role === 'owner' && dto.role !== 'owner') {
      await this.assertNotLastOwner(dto.teamId);
    }

    return this.teamMemberRepo.updateRole(dto.teamId, dto.userId, dto.role);
  }

  async joinTeam(
    teamId: string,
    user: User,
    workspace: Workspace,
  ): Promise<TeamMember> {
    const team = await this.teamRepo.findById(teamId, workspace.id);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.type !== 'open') {
      throw new ForbiddenException('This team requires an invitation to join');
    }

    const existingMember = await this.teamMemberRepo.getTeamMember(
      teamId,
      user.id,
    );
    if (existingMember) {
      throw new BadRequestException('You are already a member of this team');
    }

    const member = await this.teamMemberRepo.insertTeamMember({
      teamId,
      userId: user.id,
      role: 'member',
    });

    await this.chatWsService.addUserToTeam(user.id, teamId);
    await this.addUserToLinkedTeamSpaces(user.id, teamId, workspace.id);
    await this.addUserToPublicTeamChannels(user.id, teamId, workspace.id);
    this.chatWsService.emitToTeam(
      teamId,
      ChatWsEvent.TEAM_MEMBER_ADDED,
      member,
    );

    return member;
  }

  async getTeamGroups(teamId: string, user: User, workspace: Workspace) {
    await this.assertMember(teamId, user.id);
    return this.db
      .selectFrom('teamGroups')
      .innerJoin('groups', 'groups.id', 'teamGroups.groupId')
      .select([
        'teamGroups.id',
        'teamGroups.teamId',
        'teamGroups.groupId',
        'teamGroups.role',
        'teamGroups.createdAt',
        'groups.name',
        'groups.description',
      ])
      .where('teamGroups.teamId', '=', teamId)
      .where('teamGroups.workspaceId', '=', workspace.id)
      .orderBy('groups.name', 'asc')
      .execute();
  }

  async addTeamGroup(
    dto: AddTeamGroupDto,
    user: User,
    workspace: Workspace,
  ) {
    await this.assertOwner(dto.teamId, user.id);
    const group = await this.groupRepo.findById(dto.groupId, workspace.id);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const teamGroup = await this.db
      .insertInto('teamGroups')
      .values({
        workspaceId: workspace.id,
        teamId: dto.teamId,
        groupId: dto.groupId,
        role: dto.role ?? 'member',
      })
      .onConflict((oc) =>
        oc.columns(['teamId', 'groupId']).doUpdateSet({
          role: dto.role ?? 'member',
          updatedAt: new Date(),
        }),
      )
      .returningAll()
      .executeTakeFirst();

    const groupUserIds = await this.groupUserRepo.getUserIdsByGroupId(
      dto.groupId,
    );
    for (const userId of groupUserIds) {
      await this.ensureTeamMember(
        dto.teamId,
        userId,
        dto.role ?? 'member',
        workspace.id,
      );
    }

    return teamGroup;
  }

  async removeTeamGroup(dto: RemoveTeamGroupDto, user: User): Promise<void> {
    await this.assertOwner(dto.teamId, user.id);
    await this.db
      .deleteFrom('teamGroups')
      .where('teamId', '=', dto.teamId)
      .where('groupId', '=', dto.groupId)
      .execute();
  }

  async leaveTeam(teamId: string, user: User): Promise<void> {
    const member = await this.teamMemberRepo.getTeamMember(teamId, user.id);
    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    if (member.role === 'owner') {
      await this.assertNotLastOwner(teamId);
    }

    await this.teamMemberRepo.removeTeamMember(teamId, user.id);

    await this.chatWsService.removeUserFromTeam(user.id, teamId);
    this.chatWsService.emitToTeam(teamId, ChatWsEvent.TEAM_MEMBER_REMOVED, {
      teamId,
      userId: user.id,
    });
  }

  private async generateUniqueSlug(
    name: string,
    workspaceId: string,
  ): Promise<string> {
    const base = slugify(name) || 'team';
    let slug = base;

    while (await this.teamRepo.slugExists(slug, workspaceId)) {
      slug = `${base}-${nanoIdGen(6)}`;
    }

    return slug;
  }

  private async assertMember(
    teamId: string,
    userId: string,
  ): Promise<TeamMember> {
    const member = await this.teamMemberRepo.getTeamMember(teamId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this team');
    }
    return member;
  }

  private async assertOwner(
    teamId: string,
    userId: string,
  ): Promise<TeamMember> {
    const member = await this.assertMember(teamId, userId);
    if (member.role !== 'owner') {
      throw new ForbiddenException('Only team owners can perform this action');
    }
    return member;
  }

  private async assertNotLastOwner(teamId: string): Promise<void> {
    const ownerCount = await this.teamMemberRepo.roleCountByTeamId(
      teamId,
      'owner',
    );
    if (ownerCount <= 1) {
      throw new BadRequestException('Team must have at least one owner');
    }
  }

  private async addUserToLinkedTeamSpaces(
    userId: string,
    teamId: string,
    workspaceId: string,
  ): Promise<void> {
    const spaces = await this.spaceService.getTeamSpaces(teamId, workspaceId);
    for (const space of spaces) {
      await this.spaceMemberService.addUserToSpace(
        userId,
        space.id,
        SpaceRole.WRITER,
        workspaceId,
      );
    }
  }

  private async addUserToPublicTeamChannels(
    userId: string,
    teamId: string,
    workspaceId: string,
  ): Promise<void> {
    const channels = await this.channelRepo.getPublicTeamChannels(
      teamId,
      workspaceId,
    );
    for (const channel of channels) {
      await this.channelMemberRepo.ensureChannelMember({
        channelId: channel.id,
        userId,
        role: 'member',
      });
      await this.chatWsService.addUserToChannel(userId, channel.id);
    }
  }

  private async ensureTeamMember(
    teamId: string,
    userId: string,
    role: string,
    workspaceId: string,
  ): Promise<TeamMember> {
    const existing = await this.teamMemberRepo.getTeamMember(teamId, userId);
    if (existing) {
      return existing;
    }

    const member = await this.teamMemberRepo.insertTeamMember({
      teamId,
      userId,
      role,
    });
    await this.chatWsService.addUserToTeam(userId, teamId);
    await this.addUserToLinkedTeamSpaces(userId, teamId, workspaceId);
    await this.addUserToPublicTeamChannels(userId, teamId, workspaceId);
    this.chatWsService.emitToTeam(teamId, ChatWsEvent.TEAM_MEMBER_ADDED, member);
    return member;
  }
}
