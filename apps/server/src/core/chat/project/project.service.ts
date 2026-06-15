import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TeamMemberRepo } from '@docmost/db/repos/chat/team-member.repo';
import { TeamProjectRepo } from '@docmost/db/repos/chat/team-project.repo';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import {
  TeamProject,
  TeamProjectTask,
  User,
  Workspace,
} from '@docmost/db/types/entity.types';
import {
  CreateTeamProjectDto,
  CreateTeamProjectTaskDto,
  UpdateTeamProjectDto,
  UpdateTeamProjectTaskDto,
} from './dto/project.dto';

@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepo: TeamProjectRepo,
    private readonly teamMemberRepo: TeamMemberRepo,
    private readonly userRepo: UserRepo,
  ) {}

  async getTeamProjects(teamId: string, user: User, workspace: Workspace) {
    await this.assertMember(teamId, user.id);
    return this.projectRepo.getTeamProjects(teamId, workspace.id);
  }

  async createProject(
    dto: CreateTeamProjectDto,
    user: User,
    workspace: Workspace,
  ): Promise<TeamProject> {
    await this.assertMember(dto.teamId, user.id);

    return this.projectRepo.insertProject({
      workspaceId: workspace.id,
      teamId: dto.teamId,
      name: dto.name,
      description: dto.description,
      view: dto.view ?? 'table',
      createdById: user.id,
    });
  }

  async updateProject(
    dto: UpdateTeamProjectDto,
    user: User,
    workspace: Workspace,
  ): Promise<TeamProject> {
    const project = await this.getProjectForMember(
      dto.projectId,
      user,
      workspace,
    );

    return this.projectRepo.updateProject(dto.projectId, workspace.id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.view !== undefined && { view: dto.view }),
      teamId: project.teamId,
      workspaceId: workspace.id,
    });
  }

  async deleteProject(
    projectId: string,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    await this.getProjectForMember(projectId, user, workspace);
    await this.projectRepo.softDeleteProject(projectId, workspace.id);
  }

  async getProjectTasks(projectId: string, user: User, workspace: Workspace) {
    await this.getProjectForMember(projectId, user, workspace);
    return this.projectRepo.getProjectTasks(projectId, workspace.id);
  }

  async createTask(
    dto: CreateTeamProjectTaskDto,
    user: User,
    workspace: Workspace,
  ): Promise<TeamProjectTask> {
    const project = await this.getProjectForMember(
      dto.projectId,
      user,
      workspace,
    );
    await this.assertAssignee(dto.assigneeId, project.teamId, workspace.id);

    return this.projectRepo.insertTask({
      workspaceId: workspace.id,
      teamId: project.teamId,
      projectId: project.id,
      title: dto.title,
      description: dto.description,
      status: dto.status ?? 'todo',
      priority: dto.priority ?? 'medium',
      assigneeId: dto.assigneeId,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      sortOrder: await this.projectRepo.nextSortOrder(project.id),
      createdById: user.id,
    });
  }

  async updateTask(
    dto: UpdateTeamProjectTaskDto,
    user: User,
    workspace: Workspace,
  ): Promise<TeamProjectTask> {
    const task = await this.getTaskForMember(dto.taskId, user, workspace);
    await this.assertAssignee(dto.assigneeId, task.teamId, workspace.id);

    return this.projectRepo.updateTask(dto.taskId, workspace.id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
      ...(dto.dueAt !== undefined && { dueAt: new Date(dto.dueAt) }),
      workspaceId: workspace.id,
      teamId: task.teamId,
      projectId: task.projectId,
    });
  }

  async deleteTask(
    taskId: string,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    await this.getTaskForMember(taskId, user, workspace);
    await this.projectRepo.softDeleteTask(taskId, workspace.id);
  }

  private async getProjectForMember(
    projectId: string,
    user: User,
    workspace: Workspace,
  ): Promise<TeamProject> {
    const project = await this.projectRepo.findProjectById(
      projectId,
      workspace.id,
    );
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.assertMember(project.teamId, user.id);
    return project;
  }

  private async getTaskForMember(
    taskId: string,
    user: User,
    workspace: Workspace,
  ): Promise<TeamProjectTask> {
    const task = await this.projectRepo.findTaskById(taskId, workspace.id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.assertMember(task.teamId, user.id);
    return task;
  }

  private async assertMember(teamId: string, userId: string): Promise<void> {
    const member = await this.teamMemberRepo.getTeamMember(teamId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this team');
    }
  }

  private async assertAssignee(
    assigneeId: string | null | undefined,
    teamId: string,
    workspaceId: string,
  ): Promise<void> {
    if (!assigneeId) {
      return;
    }

    const user = await this.userRepo.findById(assigneeId, workspaceId);
    const member = await this.teamMemberRepo.getTeamMember(teamId, assigneeId);
    if (!user || !member) {
      throw new ForbiddenException('Assignee must be a member of this team');
    }
  }
}
