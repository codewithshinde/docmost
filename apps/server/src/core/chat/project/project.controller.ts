import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@likh/db/types/entity.types';
import { TeamIdDto } from '../team/dto/team.dto';
import {
  CreateTeamProjectDto,
  CreateTeamProjectTaskCommentDto,
  CreateTeamProjectTaskDto,
  DeleteTaskAttachmentDto,
  TeamProjectIdDto,
  TeamProjectTaskIdDto,
  UpdateTeamProjectDto,
  UpdateTeamProjectTaskDto,
} from './dto/project.dto';
import { ProjectService } from './project.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @HttpCode(HttpStatus.OK)
  @Post('/')
  async getUserProjects(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.projectService.getUserProjects(user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('team')
  async getTeamProjects(
    @Body() dto: TeamIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.projectService.getTeamProjects(dto.teamId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  async createProject(
    @Body() dto: CreateTeamProjectDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.projectService.createProject(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async updateProject(
    @Body() dto: UpdateTeamProjectDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.projectService.updateProject(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async deleteProject(
    @Body() dto: TeamProjectIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    await this.projectService.deleteProject(dto.projectId, user, workspace);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('tasks')
  async getProjectTasks(
    @Body() dto: TeamProjectIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.projectService.getProjectTasks(dto.projectId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('tasks/create')
  async createTask(
    @Body() dto: CreateTeamProjectTaskDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.projectService.createTask(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('tasks/update')
  async updateTask(
    @Body() dto: UpdateTeamProjectTaskDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.projectService.updateTask(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('tasks/delete')
  async deleteTask(
    @Body() dto: TeamProjectTaskIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    await this.projectService.deleteTask(dto.taskId, user, workspace);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('tasks/comments')
  async getTaskComments(
    @Body() dto: TeamProjectTaskIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.projectService.getTaskComments(dto.taskId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('tasks/comments/create')
  async createTaskComment(
    @Body() dto: CreateTeamProjectTaskCommentDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.projectService.createTaskComment(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('tasks/attachments/delete')
  async deleteTaskAttachment(
    @Body() dto: DeleteTaskAttachmentDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    await this.projectService.deleteTaskAttachment(dto, user, workspace);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('tasks/history')
  async getTaskHistory(
    @Body() dto: TeamProjectTaskIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.projectService.getTaskHistory(dto.taskId, user, workspace);
  }
}
