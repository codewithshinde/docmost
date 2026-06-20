import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('calendar_events')
    .addColumn('external_uid', 'text')
    .execute();

  await db.schema
    .createIndex('calendar_events_external_uid_workspace_idx')
    .on('calendar_events')
    .columns(['external_uid', 'workspace_id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropIndex('calendar_events_external_uid_workspace_idx')
    .execute();

  await db.schema
    .alterTable('calendar_events')
    .dropColumn('external_uid')
    .execute();
}
