import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('team_project_tasks')
    .addColumn('parent_task_id', 'uuid', (col) =>
      col.references('team_project_tasks.id').onDelete('cascade'),
    )
    .execute();

  await db.schema
    .alterTable('team_project_tasks')
    .addColumn('linked_task_ids', 'jsonb', (col) =>
      col.notNull().defaultTo('[]'),
    )
    .execute();

  await db.schema
    .createIndex('team_project_tasks_parent_task_id_idx')
    .on('team_project_tasks')
    .column('parent_task_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropIndex('team_project_tasks_parent_task_id_idx')
    .execute();

  await db.schema
    .alterTable('team_project_tasks')
    .dropColumn('linked_task_ids')
    .execute();

  await db.schema
    .alterTable('team_project_tasks')
    .dropColumn('parent_task_id')
    .execute();
}
