import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@likh/db/types/kysely.types';
import { dbOrTx } from '@likh/db/utils';
import { Call, InsertableCall } from '@likh/db/types/entity.types';
import { jsonArrayFrom } from 'kysely/helpers/postgres';

@Injectable()
export class CallRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertCall(
    insertableCall: InsertableCall,
    trx?: KyselyTransaction,
  ): Promise<Call> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('calls')
      .values(insertableCall)
      .returningAll()
      .executeTakeFirst();
  }

  async findById(callId: string, workspaceId: string): Promise<Call> {
    return this.db
      .selectFrom('calls')
      .selectAll()
      .where('id', '=', callId)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async findActiveCallForChannel(channelId: string) {
    return this.db
      .selectFrom('calls')
      .selectAll('calls')
      .select((eb) =>
        jsonArrayFrom(
          eb
            .selectFrom('callParticipants')
            .select(['callParticipants.userId', 'callParticipants.screenSharing'])
            .whereRef('callParticipants.callId', '=', 'calls.id')
            .where('callParticipants.leftAt', 'is', null),
        ).as('participants'),
      )
      .where('calls.channelId', '=', channelId)
      .where('calls.status', '=', 'active')
      .executeTakeFirst();
  }

  async endCall(callId: string, workspaceId: string): Promise<Call> {
    return this.db
      .updateTable('calls')
      .set({ status: 'ended', endedAt: new Date(), updatedAt: new Date() })
      .where('id', '=', callId)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirst();
  }
}
