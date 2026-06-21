import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { ExpressionBuilder, sql } from 'kysely';
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres';
import { KyselyDB } from '@likh/db/types/kysely.types';
import {
  InsertableTeamProject,
  InsertableTeamProjectTask,
  InsertableTeamProjectTaskHistory,
  TeamProject,
  TeamProjectTask,
  InsertableTeamProjectTaskComment,
  UpdatableTeamProject,
  UpdatableTeamProjectTask,
} from '@likh/db/types/entity.types';
import { DB } from '@likh/db/types/db';

@Injectable()
export class TeamProjectRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async getTeamProjects(teamId: string, workspaceId: string) {
    return this.db
      .selectFrom('teamProjects')
      .selectAll('teamProjects')
      .select((eb) => [
        this.withTaskCount(eb).as('taskCount'),
        this.withDoneTaskCount(eb).as('doneTaskCount'),
      ])
      .where('teamProjects.teamId', '=', teamId)
      .where('teamProjects.workspaceId', '=', workspaceId)
      .where('teamProjects.deletedAt', 'is', null)
      .orderBy('teamProjects.updatedAt', 'desc')
      .execute();
  }

  async findProjectWithStatusById(projectId: string, workspaceId: string) {
    return this.db
      .selectFrom('teamProjects')
      .selectAll()
      .where('id', '=', projectId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async getUserProjects(userId: string, workspaceId: string) {
    return this.db
      .selectFrom('teamProjects')
      .innerJoin('teamMembers', 'teamMembers.teamId', 'teamProjects.teamId')
      .innerJoin('teams', 'teams.id', 'teamProjects.teamId')
      .selectAll('teamProjects')
      .select([
        'teams.name as teamName',
        'teams.slug as teamSlug',
        'teamMembers.role as memberRole',
      ])
      .select((eb) => [
        this.withTaskCount(eb).as('taskCount'),
        this.withDoneTaskCount(eb).as('doneTaskCount'),
      ])
      .where('teamMembers.userId', '=', userId)
      .where('teamProjects.workspaceId', '=', workspaceId)
      .where('teamProjects.deletedAt', 'is', null)
      .where('teams.deletedAt', 'is', null)
      .orderBy('teamProjects.updatedAt', 'desc')
      .execute();
  }

  async findProjectById(
    projectId: string,
    workspaceId: string,
  ): Promise<TeamProject> {
    return this.db
      .selectFrom('teamProjects')
      .selectAll()
      .where('id', '=', projectId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async insertProject(project: InsertableTeamProject): Promise<TeamProject> {
    return this.db
      .insertInto('teamProjects')
      .values(project)
      .returningAll()
      .executeTakeFirst();
  }

  async updateProject(
    projectId: string,
    workspaceId: string,
    project: UpdatableTeamProject,
  ): Promise<TeamProject> {
    return this.db
      .updateTable('teamProjects')
      .set({ ...project, updatedAt: new Date() })
      .where('id', '=', projectId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .returningAll()
      .executeTakeFirst();
  }

  async softDeleteProject(
    projectId: string,
    workspaceId: string,
  ): Promise<void> {
    await this.db
      .updateTable('teamProjects')
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where('id', '=', projectId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async getProjectTasks(projectId: string, workspaceId: string) {
    return this.db
      .selectFrom('teamProjectTasks')
      .select((eb) => [
        'teamProjectTasks.id',
        'teamProjectTasks.workspaceId',
        'teamProjectTasks.teamId',
        'teamProjectTasks.projectId',
        'teamProjectTasks.title',
        'teamProjectTasks.description',
        'teamProjectTasks.issueType',
        'teamProjectTasks.tags',
        'teamProjectTasks.status',
        'teamProjectTasks.priority',
        'teamProjectTasks.assigneeId',
        'teamProjectTasks.sprint',
        'teamProjectTasks.storyPoints',
        'teamProjectTasks.externalLinks',
        'teamProjectTasks.dueAt',
        'teamProjectTasks.sortOrder',
        'teamProjectTasks.parentTaskId',
        'teamProjectTasks.linkedTaskIds',
        'teamProjectTasks.createdById',
        'teamProjectTasks.createdAt',
        'teamProjectTasks.updatedAt',
        jsonObjectFrom(
          eb
            .selectFrom('users')
            .select([
              'users.id',
              'users.name',
              'users.email',
              'users.avatarUrl',
            ])
            .whereRef('users.id', '=', 'teamProjectTasks.assigneeId'),
        ).as('assignee'),
        jsonArrayFrom(
          eb
            .selectFrom('teamProjectTaskAttachments')
            .innerJoin(
              'attachments',
              'attachments.id',
              'teamProjectTaskAttachments.attachmentId',
            )
            .select([
              'attachments.id',
              'attachments.fileName',
              'attachments.fileSize',
              'attachments.mimeType',
              'attachments.type',
            ])
            .whereRef(
              'teamProjectTaskAttachments.taskId',
              '=',
              'teamProjectTasks.id',
            ),
        ).as('attachments'),
      ])
      .where('teamProjectTasks.projectId', '=', projectId)
      .where('teamProjectTasks.workspaceId', '=', workspaceId)
      .where('teamProjectTasks.deletedAt', 'is', null)
      .orderBy('teamProjectTasks.sortOrder', 'asc')
      .orderBy('teamProjectTasks.createdAt', 'asc')
      .execute();
  }

  async findTaskById(
    taskId: string,
    workspaceId: string,
  ): Promise<TeamProjectTask> {
    return this.db
      .selectFrom('teamProjectTasks')
      .selectAll()
      .where('id', '=', taskId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async getTaskComments(taskId: string, workspaceId: string) {
    return this.db
      .selectFrom('teamProjectTaskComments')
      .select((eb) => [
        'teamProjectTaskComments.id',
        'teamProjectTaskComments.workspaceId',
        'teamProjectTaskComments.teamId',
        'teamProjectTaskComments.projectId',
        'teamProjectTaskComments.taskId',
        'teamProjectTaskComments.userId',
        'teamProjectTaskComments.content',
        'teamProjectTaskComments.createdAt',
        'teamProjectTaskComments.updatedAt',
        jsonObjectFrom(
          eb
            .selectFrom('users')
            .select([
              'users.id',
              'users.name',
              'users.email',
              'users.avatarUrl',
            ])
            .whereRef('users.id', '=', 'teamProjectTaskComments.userId'),
        ).as('user'),
      ])
      .where('teamProjectTaskComments.taskId', '=', taskId)
      .where('teamProjectTaskComments.workspaceId', '=', workspaceId)
      .where('teamProjectTaskComments.deletedAt', 'is', null)
      .orderBy('teamProjectTaskComments.createdAt', 'asc')
      .execute();
  }

  async insertTaskComment(comment: InsertableTeamProjectTaskComment) {
    return this.db
      .insertInto('teamProjectTaskComments')
      .values(comment)
      .returningAll()
      .executeTakeFirst();
  }

  async insertTask(task: InsertableTeamProjectTask): Promise<TeamProjectTask> {
    return this.db
      .insertInto('teamProjectTasks')
      .values(task)
      .returningAll()
      .executeTakeFirst();
  }

  async updateTask(
    taskId: string,
    workspaceId: string,
    task: UpdatableTeamProjectTask,
  ): Promise<TeamProjectTask> {
    return this.db
      .updateTable('teamProjectTasks')
      .set({ ...task, updatedAt: new Date() })
      .where('id', '=', taskId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .returningAll()
      .executeTakeFirst();
  }

  async softDeleteTask(taskId: string, workspaceId: string): Promise<void> {
    await this.db
      .updateTable('teamProjectTasks')
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where('id', '=', taskId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async nextSortOrder(projectId: string): Promise<number> {
    const row = await this.db
      .selectFrom('teamProjectTasks')
      .select(sql<number>`coalesce(max(sort_order), 0) + 1`.as('nextSortOrder'))
      .where('projectId', '=', projectId)
      .executeTakeFirst();

    return Number(row?.nextSortOrder ?? 1);
  }

  async insertTaskHistory(
    history: InsertableTeamProjectTaskHistory,
  ): Promise<void> {
    await this.db
      .insertInto('teamProjectTaskHistory')
      .values(history)
      .execute();
  }

  async getTaskHistory(taskId: string, workspaceId: string) {
    return this.db
      .selectFrom('teamProjectTaskHistory')
      .select((eb) => [
        'teamProjectTaskHistory.id',
        'teamProjectTaskHistory.taskId',
        'teamProjectTaskHistory.fieldChanged',
        'teamProjectTaskHistory.oldValue',
        'teamProjectTaskHistory.newValue',
        'teamProjectTaskHistory.createdAt',
        jsonObjectFrom(
          eb
            .selectFrom('users')
            .select(['users.id', 'users.name', 'users.avatarUrl'])
            .whereRef('users.id', '=', 'teamProjectTaskHistory.userId'),
        ).as('user'),
      ])
      .where('teamProjectTaskHistory.taskId', '=', taskId)
      .where('teamProjectTaskHistory.workspaceId', '=', workspaceId)
      .orderBy('teamProjectTaskHistory.createdAt', 'desc')
      .execute();
  }

  private withTaskCount(eb: ExpressionBuilder<DB, 'teamProjects'>) {
    return eb
      .selectFrom('teamProjectTasks')
      .select((eb) => eb.fn.countAll().as('count'))
      .whereRef('teamProjectTasks.projectId', '=', 'teamProjects.id')
      .where('teamProjectTasks.deletedAt', 'is', null);
  }

  private withDoneTaskCount(eb: ExpressionBuilder<DB, 'teamProjects'>) {
    return eb
      .selectFrom('teamProjectTasks')
      .select((eb) => eb.fn.countAll().as('count'))
      .whereRef('teamProjectTasks.projectId', '=', 'teamProjects.id')
      .where('teamProjectTasks.status', '=', 'done')
      .where('teamProjectTasks.deletedAt', 'is', null);
  }
}
