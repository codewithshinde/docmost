import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Teams
  await db.schema
    .createTable('teams')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('name', 'varchar', (col) => col.notNull())
    .addColumn('slug', 'varchar', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('type', 'varchar', (col) => col.notNull().defaultTo('open'))
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
    .createIndex('teams_workspace_id_slug_unique')
    .on('teams')
    .columns(['workspace_id', 'slug'])
    .unique()
    .execute();

  // Team members
  await db.schema
    .createTable('team_members')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('team_id', 'uuid', (col) =>
      col.references('teams.id').onDelete('cascade').notNull(),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('role', 'varchar', (col) => col.notNull().defaultTo('member'))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('team_members_team_id_user_id_unique', [
      'team_id',
      'user_id',
    ])
    .execute();

  await db.schema
    .createIndex('team_members_user_id_idx')
    .on('team_members')
    .column('user_id')
    .execute();

  // Channels
  await db.schema
    .createTable('channels')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('team_id', 'uuid', (col) =>
      col.references('teams.id').onDelete('cascade'),
    )
    .addColumn('name', 'varchar')
    .addColumn('slug', 'varchar')
    .addColumn('topic', 'text')
    .addColumn('purpose', 'text')
    .addColumn('type', 'varchar', (col) => col.notNull())
    .addColumn('created_by_id', 'uuid', (col) =>
      col.references('users.id').onDelete('set null'),
    )
    .addColumn('last_post_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('deleted_at', 'timestamptz')
    .execute();

  await db.schema
    .createIndex('channels_workspace_id_idx')
    .on('channels')
    .column('workspace_id')
    .execute();

  await db.schema
    .createIndex('channels_team_id_idx')
    .on('channels')
    .column('team_id')
    .execute();

  // Messages
  await db.schema
    .createTable('messages')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('channel_id', 'uuid', (col) =>
      col.references('channels.id').onDelete('cascade').notNull(),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('set null'),
    )
    .addColumn('root_id', 'uuid', (col) =>
      col.references('messages.id').onDelete('cascade'),
    )
    .addColumn('content', 'text')
    .addColumn('type', 'varchar', (col) => col.notNull().defaultTo('default'))
    .addColumn('edited_at', 'timestamptz')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex('messages_channel_id_created_at_idx')
    .on('messages')
    .columns(['channel_id', 'created_at'])
    .execute();

  await db.schema
    .createIndex('messages_root_id_idx')
    .on('messages')
    .column('root_id')
    .execute();

  // Channel members
  await db.schema
    .createTable('channel_members')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('channel_id', 'uuid', (col) =>
      col.references('channels.id').onDelete('cascade').notNull(),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('role', 'varchar', (col) => col.notNull().defaultTo('member'))
    .addColumn('last_read_message_id', 'uuid', (col) =>
      col.references('messages.id').onDelete('set null'),
    )
    .addColumn('last_read_at', 'timestamptz')
    .addColumn('notify_level', 'varchar', (col) =>
      col.notNull().defaultTo('all'),
    )
    .addColumn('muted', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('channel_members_channel_id_user_id_unique', [
      'channel_id',
      'user_id',
    ])
    .execute();

  await db.schema
    .createIndex('channel_members_user_id_idx')
    .on('channel_members')
    .column('user_id')
    .execute();

  // Message reactions
  await db.schema
    .createTable('message_reactions')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('message_id', 'uuid', (col) =>
      col.references('messages.id').onDelete('cascade').notNull(),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('emoji', 'varchar', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('message_reactions_message_user_emoji_unique', [
      'message_id',
      'user_id',
      'emoji',
    ])
    .execute();

  // Message mentions
  await db.schema
    .createTable('message_mentions')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('message_id', 'uuid', (col) =>
      col.references('messages.id').onDelete('cascade').notNull(),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex('message_mentions_user_id_idx')
    .on('message_mentions')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('message_mentions_message_id_idx')
    .on('message_mentions')
    .column('message_id')
    .execute();

  // Message attachments
  await db.schema
    .createTable('message_attachments')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('message_id', 'uuid', (col) =>
      col.references('messages.id').onDelete('cascade').notNull(),
    )
    .addColumn('attachment_id', 'uuid', (col) =>
      col.references('attachments.id').onDelete('cascade').notNull(),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('message_attachments_message_attachment_unique', [
      'message_id',
      'attachment_id',
    ])
    .execute();

  // Calls
  await db.schema
    .createTable('calls')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('channel_id', 'uuid', (col) =>
      col.references('channels.id').onDelete('cascade').notNull(),
    )
    .addColumn('started_by_id', 'uuid', (col) =>
      col.references('users.id').onDelete('set null'),
    )
    .addColumn('status', 'varchar', (col) => col.notNull().defaultTo('active'))
    .addColumn('provider', 'varchar', (col) =>
      col.notNull().defaultTo('livekit'),
    )
    .addColumn('room_name', 'varchar', (col) => col.notNull())
    .addColumn('started_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('ended_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex('calls_channel_id_idx')
    .on('calls')
    .column('channel_id')
    .execute();

  // Call participants
  await db.schema
    .createTable('call_participants')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('call_id', 'uuid', (col) =>
      col.references('calls.id').onDelete('cascade').notNull(),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('joined_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('left_at', 'timestamptz')
    .addColumn('screen_sharing', 'boolean', (col) =>
      col.notNull().defaultTo(false),
    )
    .execute();

  await db.schema
    .createIndex('call_participants_call_id_idx')
    .on('call_participants')
    .column('call_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('call_participants').execute();
  await db.schema.dropTable('calls').execute();
  await db.schema.dropTable('message_attachments').execute();
  await db.schema.dropTable('message_mentions').execute();
  await db.schema.dropTable('message_reactions').execute();
  await db.schema.dropTable('channel_members').execute();
  await db.schema.dropTable('messages').execute();
  await db.schema.dropTable('channels').execute();
  await db.schema.dropTable('team_members').execute();
  await db.schema.dropTable('teams').execute();
}
