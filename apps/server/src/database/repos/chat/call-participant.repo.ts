import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  CallParticipant,
  InsertableCallParticipant,
} from '@docmost/db/types/entity.types';
import { jsonObjectFrom } from 'kysely/helpers/postgres';

@Injectable()
export class CallParticipantRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertParticipant(
    insertableCallParticipant: InsertableCallParticipant,
    trx?: KyselyTransaction,
  ): Promise<CallParticipant> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('callParticipants')
      .values(insertableCallParticipant)
      .returningAll()
      .executeTakeFirst();
  }

  async getActiveParticipant(
    callId: string,
    userId: string,
  ): Promise<CallParticipant> {
    return this.db
      .selectFrom('callParticipants')
      .selectAll()
      .where('callId', '=', callId)
      .where('userId', '=', userId)
      .where('leftAt', 'is', null)
      .executeTakeFirst();
  }

  async markLeft(callId: string, userId: string): Promise<void> {
    await this.db
      .updateTable('callParticipants')
      .set({ leftAt: new Date(), screenSharing: false })
      .where('callId', '=', callId)
      .where('userId', '=', userId)
      .where('leftAt', 'is', null)
      .execute();
  }

  async setScreenSharing(
    callId: string,
    userId: string,
    screenSharing: boolean,
  ): Promise<void> {
    await this.db
      .updateTable('callParticipants')
      .set({ screenSharing })
      .where('callId', '=', callId)
      .where('userId', '=', userId)
      .where('leftAt', 'is', null)
      .execute();
  }

  async getActiveParticipants(callId: string) {
    return this.db
      .selectFrom('callParticipants')
      .select((eb) => [
        'callParticipants.userId',
        'callParticipants.joinedAt',
        'callParticipants.screenSharing',
        jsonObjectFrom(
          eb
            .selectFrom('users')
            .select([
              'users.id',
              'users.name',
              'users.email',
              'users.avatarUrl',
            ])
            .whereRef('users.id', '=', 'callParticipants.userId'),
        ).as('user'),
      ])
      .where('callParticipants.callId', '=', callId)
      .where('callParticipants.leftAt', 'is', null)
      .execute();
  }

  async markAllLeft(callId: string): Promise<void> {
    await this.db
      .updateTable('callParticipants')
      .set({ leftAt: new Date(), screenSharing: false })
      .where('callId', '=', callId)
      .where('leftAt', 'is', null)
      .execute();
  }
}
