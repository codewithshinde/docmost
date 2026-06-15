import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('spaces')
    .addColumn('team_id', 'uuid', (col) =>
      col.references('teams.id').onDelete('set null'),
    )
    .execute();

  await db.schema
    .createIndex('spaces_team_id_idx')
    .on('spaces')
    .column('team_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('spaces_team_id_idx').execute();
  await db.schema.alterTable('spaces').dropColumn('team_id').execute();
}
