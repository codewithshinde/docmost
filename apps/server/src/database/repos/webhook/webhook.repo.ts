import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';

@Injectable()
export class WebhookRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async findAll(workspaceId: string) {
    return this.db
      .selectFrom('webhooks')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  async findById(webhookId: string, workspaceId: string) {
    return this.db
      .selectFrom('webhooks')
      .selectAll()
      .where('id', '=', webhookId)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async findEnabledForEvent(workspaceId: string, event: string) {
    return this.db
      .selectFrom('webhooks')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('enabled', '=', true)
      .execute()
      .then((rows) =>
        rows.filter((row) => {
          const events = (row.events as string[]) ?? [];
          return events.includes(event) || events.includes('*');
        }),
      );
  }

  async insert(input: {
    workspaceId: string;
    name: string;
    url: string;
    events: string[];
    secret: string;
    createdById: string;
  }) {
    return this.db
      .insertInto('webhooks')
      .values({
        ...input,
        events: JSON.stringify(input.events),
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(webhookId: string, workspaceId: string, input: any) {
    const values = { ...input, updatedAt: new Date() };
    if (input.events) values.events = JSON.stringify(input.events);
    return this.db
      .updateTable('webhooks')
      .set(values)
      .where('id', '=', webhookId)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(webhookId: string, workspaceId: string) {
    await this.db
      .deleteFrom('webhooks')
      .where('id', '=', webhookId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }
}
