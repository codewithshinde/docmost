import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import { IntegrationSetting } from '@docmost/db/types/entity.types';

export interface UpsertIntegrationSettingInput {
  enabled?: boolean;
  config?: Record<string, any>;
  secrets?: string | null;
  updatedById?: string | null;
}

@Injectable()
export class IntegrationSettingsRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async findByKey(
    workspaceId: string,
    key: string,
    trx?: KyselyTransaction,
  ): Promise<IntegrationSetting | undefined> {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('integrationSettings')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('key', '=', key)
      .executeTakeFirst();
  }

  async findAll(workspaceId: string): Promise<IntegrationSetting[]> {
    return this.db
      .selectFrom('integrationSettings')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async upsert(
    workspaceId: string,
    key: string,
    input: UpsertIntegrationSettingInput,
    trx?: KyselyTransaction,
  ): Promise<IntegrationSetting> {
    const db = dbOrTx(this.db, trx);

    const insertValues = {
      workspaceId,
      key,
      enabled: input.enabled ?? false,
      config: JSON.stringify(input.config ?? {}),
      secrets: input.secrets ?? null,
      updatedById: input.updatedById ?? null,
    };

    return db
      .insertInto('integrationSettings')
      .values(insertValues as any)
      .onConflict((oc) =>
        oc.columns(['workspaceId', 'key']).doUpdateSet((eb) => {
          const set: Record<string, any> = {
            updatedAt: new Date(),
            updatedById: input.updatedById ?? null,
          };
          if (input.enabled !== undefined) set.enabled = input.enabled;
          if (input.config !== undefined)
            set.config = JSON.stringify(input.config);
          if (input.secrets !== undefined) set.secrets = input.secrets;
          return set;
        }),
      )
      .returningAll()
      .executeTakeFirst();
  }
}
