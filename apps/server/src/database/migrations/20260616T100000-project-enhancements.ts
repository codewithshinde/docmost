import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('team_projects')
    .addColumn('statuses', 'jsonb', (col) =>
      col.notNull().defaultTo(
        sql`'[{"id":"todo","label":"To Do","color":"gray","isDone":false},{"id":"in_progress","label":"In Progress","color":"blue","isDone":false},{"id":"blocked","label":"Blocked","color":"red","isDone":false},{"id":"done","label":"Done","color":"green","isDone":true}]'::jsonb`,
      ),
    )
    .execute();

  await db.schema
    .alterTable('team_projects')
    .addColumn('sprints', 'jsonb', (col) =>
      col.notNull().defaultTo(sql`'[]'::jsonb`),
    )
    .execute();

  await db.schema
    .alterTable('team_projects')
    .addColumn('logo_url', 'text')
    .execute();

  await db.schema
    .alterTable('team_projects')
    .addColumn('project_tags', 'jsonb', (col) =>
      col.notNull().defaultTo(sql`'[]'::jsonb`),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('team_projects')
    .dropColumn('statuses')
    .execute();

  await db.schema
    .alterTable('team_projects')
    .dropColumn('sprints')
    .execute();

  await db.schema
    .alterTable('team_projects')
    .dropColumn('logo_url')
    .execute();

  await db.schema
    .alterTable('team_projects')
    .dropColumn('project_tags')
    .execute();
}
