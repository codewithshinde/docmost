import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  ChannelMember,
  InsertableChannelMember,
  UpdatableChannelMember,
} from '@docmost/db/types/entity.types';
import { jsonObjectFrom } from 'kysely/helpers/postgres';

@Injectable()
export class ChannelMemberRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertChannelMember(
    insertableChannelMember: InsertableChannelMember,
    trx?: KyselyTransaction,
  ): Promise<ChannelMember> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('channelMembers')
      .values(insertableChannelMember)
      .returningAll()
      .executeTakeFirst();
  }

  async ensureChannelMember(
    insertableChannelMember: InsertableChannelMember,
    trx?: KyselyTransaction,
  ): Promise<ChannelMember> {
    const existing = await this.getChannelMember(
      insertableChannelMember.channelId,
      insertableChannelMember.userId,
      trx,
    );
    if (existing) {
      return existing;
    }
    return this.insertChannelMember(insertableChannelMember, trx);
  }

  async getChannelMember(
    channelId: string,
    userId: string,
    trx?: KyselyTransaction,
  ): Promise<ChannelMember> {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('channelMembers')
      .selectAll()
      .where('channelId', '=', channelId)
      .where('userId', '=', userId)
      .executeTakeFirst();
  }

  async removeChannelMember(
    channelId: string,
    userId: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);
    await db
      .deleteFrom('channelMembers')
      .where('channelId', '=', channelId)
      .where('userId', '=', userId)
      .execute();
  }

  async updateChannelMember(
    updatableChannelMember: UpdatableChannelMember,
    channelId: string,
    userId: string,
  ): Promise<ChannelMember> {
    return this.db
      .updateTable('channelMembers')
      .set({ ...updatableChannelMember, updatedAt: new Date() })
      .where('channelId', '=', channelId)
      .where('userId', '=', userId)
      .returningAll()
      .executeTakeFirst();
  }

  async getChannelMembers(channelId: string) {
    return this.db
      .selectFrom('channelMembers')
      .select((eb) => [
        'channelMembers.id',
        'channelMembers.channelId',
        'channelMembers.userId',
        'channelMembers.role',
        'channelMembers.notifyLevel',
        'channelMembers.muted',
        'channelMembers.lastReadAt',
        'channelMembers.createdAt',
        jsonObjectFrom(
          eb
            .selectFrom('users')
            .select([
              'users.id',
              'users.name',
              'users.email',
              'users.avatarUrl',
            ])
            .whereRef('users.id', '=', 'channelMembers.userId'),
        ).as('user'),
      ])
      .where('channelMembers.channelId', '=', channelId)
      .orderBy('channelMembers.createdAt', 'asc')
      .execute();
  }

  async markRead(
    channelId: string,
    userId: string,
    messageId: string,
    readAt: Date = new Date(),
  ): Promise<void> {
    await this.db
      .updateTable('channelMembers')
      .set({ lastReadMessageId: messageId, lastReadAt: readAt })
      .where('channelId', '=', channelId)
      .where('userId', '=', userId)
      .execute();
  }

  async getUnreadCounts(
    userId: string,
  ): Promise<{ channelId: string; unreadCount: number }[]> {
    const rows = await this.db
      .selectFrom('channelMembers')
      .innerJoin('messages', 'messages.channelId', 'channelMembers.channelId')
      .select([
        'channelMembers.channelId',
        (eb) => eb.fn.countAll().as('unreadCount'),
      ])
      .where('channelMembers.userId', '=', userId)
      .where('messages.deletedAt', 'is', null)
      .where((eb) =>
        eb.or([
          eb('channelMembers.lastReadAt', 'is', null),
          eb(
            'messages.createdAt',
            '>',
            eb.ref('channelMembers.lastReadAt'),
          ),
        ]),
      )
      .groupBy('channelMembers.channelId')
      .execute();

    return rows.map((row) => ({
      channelId: row.channelId,
      unreadCount: Number(row.unreadCount),
    }));
  }
}
