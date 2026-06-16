import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { InsertableTeamProjectTaskAttachment } from '@docmost/db/types/entity.types';

@Injectable()
export class TaskAttachmentRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertTaskAttachment(
    data: InsertableTeamProjectTaskAttachment,
  ): Promise<void> {
    await this.db
      .insertInto('teamProjectTaskAttachments')
      .values(data)
      .onConflict((oc) =>
        oc
          .constraint('task_attachments_task_id_attachment_id_unique')
          .doNothing(),
      )
      .execute();
  }

  async getTaskAttachments(taskId: string) {
    return this.db
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
        'teamProjectTaskAttachments.createdAt',
      ])
      .where('teamProjectTaskAttachments.taskId', '=', taskId)
      .orderBy('teamProjectTaskAttachments.createdAt', 'asc')
      .execute();
  }

  async getAttachmentsForTasks(taskIds: string[]) {
    if (taskIds.length === 0) return {};

    const rows = await this.db
      .selectFrom('teamProjectTaskAttachments')
      .innerJoin(
        'attachments',
        'attachments.id',
        'teamProjectTaskAttachments.attachmentId',
      )
      .select([
        'teamProjectTaskAttachments.taskId',
        'attachments.id',
        'attachments.fileName',
        'attachments.fileSize',
        'attachments.mimeType',
        'attachments.type',
      ])
      .where('teamProjectTaskAttachments.taskId', 'in', taskIds)
      .execute();

    return rows.reduce<Record<string, any[]>>((acc, row) => {
      const { taskId, ...attachment } = row;
      (acc[taskId] ??= []).push(attachment);
      return acc;
    }, {});
  }

  async deleteTaskAttachment(
    taskId: string,
    attachmentId: string,
  ): Promise<void> {
    await this.db
      .deleteFrom('teamProjectTaskAttachments')
      .where('taskId', '=', taskId)
      .where('attachmentId', '=', attachmentId)
      .execute();
  }
}
