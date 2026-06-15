import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('team_projects')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('team_id', 'uuid', (col) =>
      col.references('teams.id').onDelete('cascade').notNull(),
    )
    .addColumn('name', 'varchar', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('view', 'varchar', (col) => col.notNull().defaultTo('table'))
    .addColumn('created_by_id', 'uuid', (col) =>
      col.references('users.id').onDelete('set null'),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('deleted_at', 'timestamptz')
    .execute();

  await db.schema
    .createIndex('team_projects_team_id_idx')
    .on('team_projects')
    .column('team_id')
    .execute();

  await db.schema
    .createTable('team_project_tasks')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('team_id', 'uuid', (col) =>
      col.references('teams.id').onDelete('cascade').notNull(),
    )
    .addColumn('project_id', 'uuid', (col) =>
      col.references('team_projects.id').onDelete('cascade').notNull(),
    )
    .addColumn('title', 'varchar', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('status', 'varchar', (col) => col.notNull().defaultTo('todo'))
    .addColumn('priority', 'varchar', (col) =>
      col.notNull().defaultTo('medium'),
    )
    .addColumn('assignee_id', 'uuid', (col) =>
      col.references('users.id').onDelete('set null'),
    )
    .addColumn('due_at', 'timestamptz')
    .addColumn('sort_order', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_by_id', 'uuid', (col) =>
      col.references('users.id').onDelete('set null'),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('deleted_at', 'timestamptz')
    .execute();

  await db.schema
    .createIndex('team_project_tasks_project_id_idx')
    .on('team_project_tasks')
    .column('project_id')
    .execute();

  await db.schema
    .createIndex('team_project_tasks_team_status_idx')
    .on('team_project_tasks')
    .columns(['team_id', 'status'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('team_project_tasks').execute();
  await db.schema.dropTable('team_projects').execute();
}
