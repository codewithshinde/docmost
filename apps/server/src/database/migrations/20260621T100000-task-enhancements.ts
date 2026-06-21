import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('team_project_tasks')
    .addColumn('ticket_number', 'integer')
    .execute();

  await db.schema
    .alterTable('team_project_tasks')
    .addColumn('linked_page_ids', 'jsonb', (col) =>
      col.defaultTo(sql`'[]'::jsonb`).notNull(),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('team_project_tasks')
    .dropColumn('ticket_number')
    .execute();

  await db.schema
    .alterTable('team_project_tasks')
    .dropColumn('linked_page_ids')
    .execute();
}
