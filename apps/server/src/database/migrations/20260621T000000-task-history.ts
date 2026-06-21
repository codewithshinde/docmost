import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('team_project_task_history')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('task_id', 'uuid', (col) =>
      col.notNull().references('team_project_tasks.id').onDelete('cascade'),
    )
    .addColumn('project_id', 'uuid', (col) => col.notNull())
    .addColumn('workspace_id', 'uuid', (col) => col.notNull())
    .addColumn('user_id', 'uuid', (col) => col.notNull())
    .addColumn('field_changed', 'varchar', (col) => col.notNull())
    .addColumn('old_value', 'text')
    .addColumn('new_value', 'text')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex('team_project_task_history_task_id_idx')
    .on('team_project_task_history')
    .column('task_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('team_project_task_history_task_id_idx').execute();
  await db.schema.dropTable('team_project_task_history').execute();
}
