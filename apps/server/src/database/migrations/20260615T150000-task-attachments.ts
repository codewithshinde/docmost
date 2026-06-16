import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('team_project_task_attachments')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('task_id', 'uuid', (col) =>
      col
        .references('team_project_tasks.id')
        .onDelete('cascade')
        .notNull(),
    )
    .addColumn('attachment_id', 'uuid', (col) =>
      col.references('attachments.id').onDelete('cascade').notNull(),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint(
      'task_attachments_task_id_attachment_id_unique',
      ['task_id', 'attachment_id'],
    )
    .execute();

  await db.schema
    .createIndex('team_project_task_attachments_task_id_idx')
    .on('team_project_task_attachments')
    .column('task_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropTable('team_project_task_attachments')
    .execute();
}
