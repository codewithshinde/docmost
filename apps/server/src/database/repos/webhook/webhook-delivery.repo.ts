import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@likh/db/types/kysely.types';

@Injectable()
export class WebhookDeliveryRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insert(input: {
    workspaceId: string;
    webhookId: string;
    event: string;
    payload: Record<string, any>;
  }) {
    return this.db
      .insertInto('webhookDeliveries')
      .values({
        ...input,
        payload: JSON.stringify(input.payload),
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findById(deliveryId: string) {
    return this.db
      .selectFrom('webhookDeliveries')
      .selectAll()
      .where('id', '=', deliveryId)
      .executeTakeFirst();
  }

  async findRecent(webhookId: string, workspaceId: string, limit = 20) {
    return this.db
      .selectFrom('webhookDeliveries')
      .selectAll()
      .where('webhookId', '=', webhookId)
      .where('workspaceId', '=', workspaceId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .execute();
  }

  async markDelivered(deliveryId: string, statusCode: number, responseBody: string) {
    await this.db
      .updateTable('webhookDeliveries')
      .set({
        status: 'delivered',
        statusCode,
        responseBody: responseBody.slice(0, 5000),
        error: null,
        deliveredAt: new Date(),
        updatedAt: new Date(),
        attempts: (eb) => eb('attempts', '+', 1),
      })
      .where('id', '=', deliveryId)
      .execute();
  }

  async markFailed(deliveryId: string, error: string, statusCode?: number) {
    await this.db
      .updateTable('webhookDeliveries')
      .set({
        status: 'failed',
        statusCode: statusCode ?? null,
        error: error.slice(0, 5000),
        updatedAt: new Date(),
        attempts: (eb) => eb('attempts', '+', 1),
      })
      .where('id', '=', deliveryId)
      .execute();
  }
}
