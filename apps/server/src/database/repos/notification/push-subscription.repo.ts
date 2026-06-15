import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import {
  InsertablePushSubscription,
  PushSubscription,
} from '@docmost/db/types/entity.types';

@Injectable()
export class PushSubscriptionRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async upsertSubscription(
    insertable: InsertablePushSubscription,
  ): Promise<PushSubscription> {
    return this.db
      .insertInto('pushSubscriptions')
      .values(insertable)
      .onConflict((oc) =>
        oc.column('endpoint').doUpdateSet({
          userId: insertable.userId,
          workspaceId: insertable.workspaceId,
          p256dh: insertable.p256dh,
          auth: insertable.auth,
          userAgent: insertable.userAgent,
        }),
      )
      .returningAll()
      .executeTakeFirst();
  }

  async getSubscriptionsForUser(userId: string): Promise<PushSubscription[]> {
    return this.db
      .selectFrom('pushSubscriptions')
      .selectAll()
      .where('userId', '=', userId)
      .execute();
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.db
      .deleteFrom('pushSubscriptions')
      .where('endpoint', '=', endpoint)
      .execute();
  }

  async deleteSubscription(endpoint: string, userId: string): Promise<void> {
    await this.db
      .deleteFrom('pushSubscriptions')
      .where('endpoint', '=', endpoint)
      .where('userId', '=', userId)
      .execute();
  }
}
