import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .alterColumn('email', (col) => col.dropNotNull())
    .execute();

  await db.schema
    .alterTable('users')
    .addColumn('username', 'varchar', (col) => col)
    .execute();

  await db.schema
    .alterTable('users')
    .addUniqueConstraint('users_username_workspace_id_unique', [
      'username',
      'workspace_id',
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .dropConstraint('users_username_workspace_id_unique')
    .execute();

  await db.schema.alterTable('users').dropColumn('username').execute();

  await db.schema
    .alterTable('users')
    .alterColumn('email', (col) => col.setNotNull())
    .execute();
}
