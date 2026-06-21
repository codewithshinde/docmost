import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@likh/db/types/kysely.types';
import { dbOrTx } from '@likh/db/utils';
import {
  Channel,
  InsertableChannel,
  UpdatableChannel,
} from '@likh/db/types/entity.types';
import { ExpressionBuilder, sql } from 'kysely';
import { DB } from '@likh/db/types/db';
import { jsonArrayFrom } from 'kysely/helpers/postgres';

@Injectable()
export class ChannelRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async findById(
    channelId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<Channel> {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('channels')
      .selectAll()
      .where('id', '=', channelId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async findByTeamAndSlug(
    teamId: string,
    slug: string,
    workspaceId: string,
  ): Promise<Channel> {
    return this.db
      .selectFrom('channels')
      .selectAll()
      .where('teamId', '=', teamId)
      .where(sql`LOWER(slug)`, '=', sql`LOWER(${slug})`)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async slugExistsInTeam(
    slug: string,
    teamId: string,
    trx?: KyselyTransaction,
  ): Promise<boolean> {
    const db = dbOrTx(this.db, trx);
    const { count } = await db
      .selectFrom('channels')
      .select((eb) => eb.fn.count('id').as('count'))
      .where(sql`LOWER(slug)`, '=', sql`LOWER(${slug})`)
      .where('teamId', '=', teamId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

    return Number(count) > 0;
  }

  async insertChannel(
    insertableChannel: InsertableChannel,
    trx?: KyselyTransaction,
  ): Promise<Channel> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('channels')
      .values(insertableChannel)
      .returningAll()
      .executeTakeFirst();
  }

  async updateChannel(
    updatableChannel: UpdatableChannel,
    channelId: string,
    workspaceId: string,
  ): Promise<Channel> {
    return this.db
      .updateTable('channels')
      .set({ ...updatableChannel, updatedAt: new Date() })
      .where('id', '=', channelId)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirst();
  }

  async archiveChannel(channelId: string, workspaceId: string): Promise<void> {
    await this.db
      .updateTable('channels')
      .set({ deletedAt: new Date() })
      .where('id', '=', channelId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async updateLastPostAt(
    channelId: string,
    date: Date = new Date(),
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .updateTable('channels')
      .set({ lastPostAt: date })
      .where('id', '=', channelId)
      .execute();
  }

  async getTeamChannels(teamId: string, userId: string) {
    return this.db
      .selectFrom('channels')
      .selectAll('channels')
      .select((eb) => this.withMemberCount(eb))
      .where('channels.teamId', '=', teamId)
      .where('channels.deletedAt', 'is', null)
      .where((eb) =>
        eb.or([
          eb('channels.type', '=', 'public'),
          eb.exists(
            eb
              .selectFrom('channelMembers')
              .select('channelMembers.id')
              .whereRef('channelMembers.channelId', '=', 'channels.id')
              .where('channelMembers.userId', '=', userId),
          ),
        ]),
      )
      .orderBy('channels.name', 'asc')
      .execute();
  }

  async getPublicTeamChannels(teamId: string, workspaceId?: string) {
    let query = this.db
      .selectFrom('channels')
      .selectAll()
      .where('teamId', '=', teamId)
      .where('type', '=', 'public')
      .where('deletedAt', 'is', null);

    if (workspaceId) {
      query = query.where('workspaceId', '=', workspaceId);
    }

    return query.orderBy('name', 'asc').execute();
  }

  async getDirectChannelsForUser(userId: string, workspaceId: string) {
    return this.db
      .selectFrom('channels')
      .selectAll('channels')
      .select((eb) =>
        jsonArrayFrom(
          eb
            .selectFrom('channelMembers')
            .innerJoin('users', 'users.id', 'channelMembers.userId')
            .select([
              'users.id',
              'users.name',
              'users.email',
              'users.avatarUrl',
            ])
            .whereRef('channelMembers.channelId', '=', 'channels.id'),
        ).as('members'),
      )
      .where('channels.workspaceId', '=', workspaceId)
      .where((eb) =>
        eb.or([eb('channels.type', '=', 'dm'), eb('channels.type', '=', 'group_dm')]),
      )
      .where('channels.deletedAt', 'is', null)
      .where((eb) =>
        eb.exists(
          eb
            .selectFrom('channelMembers')
            .select('channelMembers.id')
            .whereRef('channelMembers.channelId', '=', 'channels.id')
            .where('channelMembers.userId', '=', userId),
        ),
      )
      .orderBy(sql`coalesce(channels.last_post_at, channels.created_at)`, 'desc')
      .execute();
  }

  async getUserChannelIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('channelMembers')
      .select('channelId')
      .where('userId', '=', userId)
      .execute();
    return rows.map((row) => row.channelId);
  }

  async findDirectChannel(
    workspaceId: string,
    userIds: string[],
    type: string,
  ): Promise<Channel | undefined> {
    const sortedIds = [...userIds].sort();

    const result = await this.db
      .selectFrom('channelMembers')
      .innerJoin('channels', 'channels.id', 'channelMembers.channelId')
      .select('channels.id as channelId')
      .where('channels.workspaceId', '=', workspaceId)
      .where('channels.type', '=', type)
      .where('channels.deletedAt', 'is', null)
      .groupBy('channels.id')
      .having(
        sql<boolean>`array_agg(channel_members.user_id ORDER BY channel_members.user_id) = ARRAY[${sql.join(sortedIds)}]::uuid[]`,
      )
      .executeTakeFirst();

    if (!result) {
      return undefined;
    }

    return this.findById(result.channelId, workspaceId);
  }

  withMemberCount(eb: ExpressionBuilder<DB, 'channels'>) {
    return eb
      .selectFrom('channelMembers')
      .select((eb) => eb.fn.countAll().as('count'))
      .whereRef('channelMembers.channelId', '=', 'channels.id')
      .as('memberCount');
  }
}
