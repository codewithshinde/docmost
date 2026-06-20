import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('team_groups')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('team_id', 'uuid', (col) =>
      col.references('teams.id').onDelete('cascade').notNull(),
    )
    .addColumn('group_id', 'uuid', (col) =>
      col.references('groups.id').onDelete('cascade').notNull(),
    )
    .addColumn('role', 'varchar', (col) => col.notNull().defaultTo('member'))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex('team_groups_team_group_idx')
    .on('team_groups')
    .columns(['team_id', 'group_id'])
    .unique()
    .execute();

  await db.schema
    .alterTable('team_project_tasks')
    .addColumn('issue_type', 'varchar', (col) =>
      col.notNull().defaultTo('task'),
    )
    .addColumn('tags', 'jsonb', (col) =>
      col.notNull().defaultTo(sql`'[]'::jsonb`),
    )
    .addColumn('sprint', 'varchar')
    .addColumn('story_points', 'integer')
    .addColumn('external_links', 'jsonb', (col) =>
      col.notNull().defaultTo(sql`'[]'::jsonb`),
    )
    .execute();

  await db.schema
    .createTable('team_project_task_comments')
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
    .addColumn('task_id', 'uuid', (col) =>
      col.references('team_project_tasks.id').onDelete('cascade').notNull(),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('set null'),
    )
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('deleted_at', 'timestamptz')
    .execute();

  await db.schema
    .createIndex('team_project_task_comments_task_id_idx')
    .on('team_project_task_comments')
    .column('task_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('team_project_task_comments').execute();
  await db.schema
    .alterTable('team_project_tasks')
    .dropColumn('external_links')
    .dropColumn('story_points')
    .dropColumn('sprint')
    .dropColumn('tags')
    .dropColumn('issue_type')
    .execute();
  await db.schema.dropIndex('team_groups_team_group_idx').execute();
  await db.schema.dropTable('team_groups').execute();
}
