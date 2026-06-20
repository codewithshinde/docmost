import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';

@Injectable()
export class MessageMentionRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertMentions(
    messageId: string,
    userIds: string[],
    trx?: KyselyTransaction,
  ): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    const db = dbOrTx(this.db, trx);
    await db
      .insertInto('messageMentions')
      .values(userIds.map((userId) => ({ messageId, userId })))
      .execute();
  }

  async getMentionsForMessage(messageId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('messageMentions')
      .select('userId')
      .where('messageId', '=', messageId)
      .execute();

    return rows.map((row) => row.userId);
  }
}
