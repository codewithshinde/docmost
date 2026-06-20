import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('user_mail_accounts')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull().unique(),
    )
    .addColumn('email_address', 'varchar', (col) => col.notNull())
    .addColumn('imap_host', 'varchar', (col) => col.notNull())
    .addColumn('imap_port', 'integer', (col) => col.notNull().defaultTo(993))
    .addColumn('imap_secure', 'boolean', (col) =>
      col.notNull().defaultTo(true),
    )
    .addColumn('smtp_host', 'varchar')
    .addColumn('smtp_port', 'integer')
    .addColumn('smtp_secure', 'boolean', (col) =>
      col.notNull().defaultTo(true),
    )
    .addColumn('username', 'varchar')
    .addColumn('secrets', 'text')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('user_mail_accounts').execute();
}
