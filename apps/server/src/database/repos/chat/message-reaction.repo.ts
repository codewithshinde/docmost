import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@likh/db/types/kysely.types';
import { dbOrTx } from '@likh/db/utils';
import {
  InsertableMessageReaction,
  MessageReaction,
} from '@likh/db/types/entity.types';

@Injectable()
export class MessageReactionRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async addReaction(
    insertableMessageReaction: InsertableMessageReaction,
    trx?: KyselyTransaction,
  ): Promise<MessageReaction | undefined> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('messageReactions')
      .values(insertableMessageReaction)
      .onConflict((oc) =>
        oc.columns(['messageId', 'userId', 'emoji']).doNothing(),
      )
      .returningAll()
      .executeTakeFirst();
  }

  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    await this.db
      .deleteFrom('messageReactions')
      .where('messageId', '=', messageId)
      .where('userId', '=', userId)
      .where('emoji', '=', emoji)
      .execute();
  }

  async getReactionsForMessage(messageId: string) {
    return this.db
      .selectFrom('messageReactions')
      .select(['emoji', 'userId'])
      .where('messageId', '=', messageId)
      .execute();
  }

  async getReactionsForMessages(messageIds: string[]) {
    if (messageIds.length === 0) {
      return {};
    }

    const rows = await this.db
      .selectFrom('messageReactions')
      .select(['messageId', 'emoji', 'userId'])
      .where('messageId', 'in', messageIds)
      .execute();

    return rows.reduce<Record<string, { emoji: string; userId: string }[]>>(
      (acc, row) => {
        (acc[row.messageId] ??= []).push({
          emoji: row.emoji,
          userId: row.userId,
        });
        return acc;
      },
      {},
    );
  }
}
