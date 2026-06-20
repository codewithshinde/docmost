import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .addColumn('phone', 'varchar')
    .addColumn('address', 'text')
    .addColumn('emergency_contact_name', 'varchar')
    .addColumn('emergency_contact_phone', 'varchar')
    .addColumn('designation', 'varchar')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .dropColumn('designation')
    .dropColumn('emergency_contact_phone')
    .dropColumn('emergency_contact_name')
    .dropColumn('address')
    .dropColumn('phone')
    .execute();
}
