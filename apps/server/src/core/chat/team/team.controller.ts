import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { TeamService } from './team.service';
import {
  AddTeamMemberDto,
  AddTeamGroupDto,
  CreateTeamDto,
  RemoveTeamGroupDto,
  RemoveTeamMemberDto,
  TeamIdDto,
  UpdateTeamDto,
  UpdateTeamMemberRoleDto,
} from './dto/team.dto';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@likh/db/types/entity.types';

@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @HttpCode(HttpStatus.OK)
  @Post('/')
  async getTeams(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    return this.teamService.getUserTeams(user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('info')
  async getTeamById(
    @Body() dto: TeamIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.teamService.getTeamById(dto.teamId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  async createTeam(
    @Body() dto: CreateTeamDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.teamService.createTeam(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async updateTeam(
    @Body() dto: UpdateTeamDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.teamService.updateTeam(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async deleteTeam(
    @Body() dto: TeamIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.teamService.deleteTeam(dto.teamId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('members')
  async getTeamMembers(
    @Body() dto: TeamIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.teamService.getTeamMembers(dto.teamId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('members/add')
  async addTeamMember(
    @Body() dto: AddTeamMemberDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.teamService.addTeamMember(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('members/remove')
  async removeTeamMember(@Body() dto: RemoveTeamMemberDto, @AuthUser() user: User) {
    await this.teamService.removeTeamMember(dto, user);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('members/update-role')
  async updateTeamMemberRole(
    @Body() dto: UpdateTeamMemberRoleDto,
    @AuthUser() user: User,
  ) {
    return this.teamService.updateTeamMemberRole(dto, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('groups')
  async getTeamGroups(
    @Body() dto: TeamIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.teamService.getTeamGroups(dto.teamId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('groups/add')
  async addTeamGroup(
    @Body() dto: AddTeamGroupDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.teamService.addTeamGroup(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('groups/remove')
  async removeTeamGroup(
    @Body() dto: RemoveTeamGroupDto,
    @AuthUser() user: User,
  ) {
    await this.teamService.removeTeamGroup(dto, user);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('join')
  async joinTeam(
    @Body() dto: TeamIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.teamService.joinTeam(dto.teamId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('leave')
  async leaveTeam(@Body() dto: TeamIdDto, @AuthUser() user: User) {
    await this.teamService.leaveTeam(dto.teamId, user);
    return { success: true };
  }
}
