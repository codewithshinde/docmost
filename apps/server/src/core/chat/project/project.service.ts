import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TeamMemberRepo } from '@likh/db/repos/chat/team-member.repo';
import { TeamProjectRepo } from '@likh/db/repos/chat/team-project.repo';
import { UserRepo } from '@likh/db/repos/user/user.repo';
import {
  TeamProject,
  TeamProjectTask,
  User,
  Workspace,
} from '@likh/db/types/entity.types';
import {
  CreateTeamProjectDto,
  CreateTeamProjectTaskCommentDto,
  CreateTeamProjectTaskDto,
  DeleteTaskAttachmentDto,
  UpdateTeamProjectDto,
  UpdateTeamProjectTaskDto,
} from './dto/project.dto';
import { TaskAttachmentRepo } from '@likh/db/repos/chat/task-attachment.repo';

@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepo: TeamProjectRepo,
    private readonly teamMemberRepo: TeamMemberRepo,
    private readonly userRepo: UserRepo,
    private readonly taskAttachmentRepo: TaskAttachmentRepo,
  ) {}

  async getTeamProjects(teamId: string, user: User, workspace: Workspace) {
    await this.assertMember(teamId, user.id);
    return this.projectRepo.getTeamProjects(teamId, workspace.id);
  }

  async getUserProjects(user: User, workspace: Workspace) {
    return this.projectRepo.getUserProjects(user.id, workspace.id);
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
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      ...(dto.statuses !== undefined && { statuses: dto.statuses as any }),
      ...(dto.sprints !== undefined && { sprints: dto.sprints as any }),
      ...(dto.projectTags !== undefined && { projectTags: dto.projectTags as any }),
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
      issueType: dto.issueType ?? 'task',
      tags: dto.tags ?? [],
      status: dto.status ?? 'todo',
      priority: dto.priority ?? 'medium',
      assigneeId: dto.assigneeId,
      sprint: dto.sprint,
      storyPoints: dto.storyPoints,
      externalLinks: dto.externalLinks ?? [],
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      sortOrder: await this.projectRepo.nextSortOrder(project.id),
      ticketNumber: await this.projectRepo.nextTicketNumber(project.id),
      linkedPageIds: dto.linkedPageIds ?? [],
      createdById: user.id,
      parentTaskId: dto.parentTaskId ?? null,
    });
  }

  async updateTask(
    dto: UpdateTeamProjectTaskDto,
    user: User,
    workspace: Workspace,
  ): Promise<TeamProjectTask> {
    const task = await this.getTaskForMember(dto.taskId, user, workspace);
    await this.assertAssignee(dto.assigneeId, task.teamId, workspace.id);

    // Track which fields changed for history
    const trackedFields: Array<{ field: string; oldV: string | null; newV: string | null }> = [];
    const stringify = (v: any) => (v == null ? null : String(v));
    const check = (field: string, oldVal: any, newVal: any) => {
      const o = stringify(oldVal);
      const n = stringify(newVal);
      if (newVal !== undefined && o !== n) trackedFields.push({ field, oldV: o, newV: n });
    };
    check('title', task.title, dto.title);
    check('status', task.status, dto.status);
    check('priority', task.priority, dto.priority);
    check('issueType', task.issueType, dto.issueType);
    check('assigneeId', task.assigneeId, dto.assigneeId);
    check('sprint', task.sprint, dto.sprint);
    check('storyPoints', task.storyPoints, dto.storyPoints);
    check('dueAt', task.dueAt ? task.dueAt.toISOString().slice(0, 10) : null, dto.dueAt ? dto.dueAt.slice(0, 10) : undefined);
    if (dto.tags !== undefined && JSON.stringify(task.tags) !== JSON.stringify(dto.tags)) {
      trackedFields.push({ field: 'tags', oldV: JSON.stringify(task.tags), newV: JSON.stringify(dto.tags) });
    }
    if (dto.linkedTaskIds !== undefined && JSON.stringify(task.linkedTaskIds) !== JSON.stringify(dto.linkedTaskIds)) {
      trackedFields.push({ field: 'linkedTaskIds', oldV: JSON.stringify(task.linkedTaskIds), newV: JSON.stringify(dto.linkedTaskIds) });
    }
    if (dto.description !== undefined && dto.description !== task.description) {
      trackedFields.push({ field: 'description', oldV: task.description ? 'updated' : null, newV: 'updated' });
    }

    const updated = await this.projectRepo.updateTask(dto.taskId, workspace.id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.issueType !== undefined && { issueType: dto.issueType }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
      ...(dto.sprint !== undefined && { sprint: dto.sprint }),
      ...(dto.storyPoints !== undefined && { storyPoints: dto.storyPoints }),
      ...(dto.externalLinks !== undefined && {
        externalLinks: dto.externalLinks,
      }),
      ...(dto.dueAt !== undefined && { dueAt: new Date(dto.dueAt) }),
      ...(dto.parentTaskId !== undefined && { parentTaskId: dto.parentTaskId }),
      ...(dto.linkedTaskIds !== undefined && {
        linkedTaskIds: dto.linkedTaskIds,
      }),
      ...(dto.linkedPageIds !== undefined && {
        linkedPageIds: dto.linkedPageIds,
      }),
      workspaceId: workspace.id,
      teamId: task.teamId,
      projectId: task.projectId,
    });

    // Insert history records asynchronously
    for (const { field, oldV, newV } of trackedFields) {
      this.projectRepo.insertTaskHistory({
        taskId: task.id,
        projectId: task.projectId,
        workspaceId: workspace.id,
        userId: user.id,
        fieldChanged: field,
        oldValue: oldV,
        newValue: newV,
      }).catch(() => {});
    }

    return updated;
  }

  async getTaskHistory(taskId: string, user: User, workspace: Workspace) {
    await this.getTaskForMember(taskId, user, workspace);
    return this.projectRepo.getTaskHistory(taskId, workspace.id);
  }

  async deleteTask(
    taskId: string,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    await this.getTaskForMember(taskId, user, workspace);
    await this.projectRepo.softDeleteTask(taskId, workspace.id);
  }

  async getTaskComments(taskId: string, user: User, workspace: Workspace) {
    await this.getTaskForMember(taskId, user, workspace);
    return this.projectRepo.getTaskComments(taskId, workspace.id);
  }

  async createTaskComment(
    dto: CreateTeamProjectTaskCommentDto,
    user: User,
    workspace: Workspace,
  ) {
    const task = await this.getTaskForMember(dto.taskId, user, workspace);
    return this.projectRepo.insertTaskComment({
      workspaceId: workspace.id,
      teamId: task.teamId,
      projectId: task.projectId,
      taskId: task.id,
      userId: user.id,
      content: dto.content,
    });
  }

  async deleteTaskAttachment(
    dto: DeleteTaskAttachmentDto,
    user: User,
    workspace: Workspace,
  ): Promise<void> {
    await this.getTaskForMember(dto.taskId, user, workspace);
    await this.taskAttachmentRepo.deleteTaskAttachment(dto.taskId, dto.attachmentId);
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
