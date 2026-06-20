import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('bookings').execute();
  await db.schema.dropTable('event_types').execute();
  await db.schema.dropTable('availability_schedules').execute();

  await db.schema
    .createTable('calendar_events')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('organizer_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('title', 'varchar', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('location', 'varchar')
    .addColumn('meeting_url', 'varchar')
    .addColumn('starts_at', 'timestamptz', (col) => col.notNull())
    .addColumn('ends_at', 'timestamptz', (col) => col.notNull())
    .addColumn('all_day', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('visibility', 'varchar', (col) =>
      col.notNull().defaultTo('default'),
    )
    .addColumn('status', 'varchar', (col) =>
      col.notNull().defaultTo('confirmed'),
    )
    .addColumn('color', 'varchar')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex('calendar_events_organizer_starts_at_idx')
    .on('calendar_events')
    .columns(['organizer_id', 'starts_at'])
    .execute();

  await db.schema
    .createTable('calendar_event_attendees')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('event_id', 'uuid', (col) =>
      col.references('calendar_events.id').onDelete('cascade').notNull(),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('role', 'varchar', (col) => col.notNull().defaultTo('attendee'))
    .addColumn('response_status', 'varchar', (col) =>
      col.notNull().defaultTo('needsAction'),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('calendar_event_attendees_event_user_unique', [
      'event_id',
      'user_id',
    ])
    .execute();

  await db.schema
    .createIndex('calendar_event_attendees_user_id_idx')
    .on('calendar_event_attendees')
    .column('user_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('calendar_event_attendees').execute();
  await db.schema.dropTable('calendar_events').execute();

  await db.schema
    .createTable('availability_schedules')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('name', 'varchar', (col) => col.notNull())
    .addColumn('time_zone', 'varchar', (col) => col.notNull().defaultTo('UTC'))
    .addColumn('rules', 'jsonb', (col) =>
      col.notNull().defaultTo(sql`'[]'::jsonb`),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex('availability_schedules_user_id_idx')
    .on('availability_schedules')
    .column('user_id')
    .execute();

  await db.schema
    .createTable('event_types')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('schedule_id', 'uuid', (col) =>
      col.references('availability_schedules.id').onDelete('set null'),
    )
    .addColumn('name', 'varchar', (col) => col.notNull())
    .addColumn('slug', 'varchar', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('duration_minutes', 'integer', (col) =>
      col.notNull().defaultTo(30),
    )
    .addColumn('minimum_notice_minutes', 'integer', (col) =>
      col.notNull().defaultTo(60),
    )
    .addColumn('enabled', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('event_types_workspace_user_slug_unique', [
      'workspace_id',
      'user_id',
      'slug',
    ])
    .execute();

  await db.schema
    .createTable('bookings')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('event_type_id', 'uuid', (col) =>
      col.references('event_types.id').onDelete('cascade').notNull(),
    )
    .addColumn('host_user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('booker_name', 'varchar', (col) => col.notNull())
    .addColumn('booker_email', 'varchar', (col) => col.notNull())
    .addColumn('starts_at', 'timestamptz', (col) => col.notNull())
    .addColumn('ends_at', 'timestamptz', (col) => col.notNull())
    .addColumn('status', 'varchar', (col) =>
      col.notNull().defaultTo('confirmed'),
    )
    .addColumn('notes', 'text')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex('bookings_host_user_starts_at_idx')
    .on('bookings')
    .columns(['host_user_id', 'starts_at'])
    .execute();
}
