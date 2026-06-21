import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@likh/db/types/kysely.types';
import { dbOrTx } from '@likh/db/utils';
import { UserMailAccount } from '@likh/db/types/entity.types';

export interface UpsertUserMailAccountInput {
  emailAddress: string;
  imapHost: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean;
  username?: string | null;
  secrets: string | null;
}

@Injectable()
export class MailAccountRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async findByUserId(
    userId: string,
    trx?: KyselyTransaction,
  ): Promise<UserMailAccount | undefined> {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('userMailAccounts')
      .selectAll()
      .where('userId', '=', userId)
      .executeTakeFirst();
  }

  async upsert(
    userId: string,
    input: UpsertUserMailAccountInput,
  ): Promise<UserMailAccount> {
    const values = {
      emailAddress: input.emailAddress,
      imapHost: input.imapHost,
      imapPort: input.imapPort ?? 993,
      imapSecure: input.imapSecure ?? true,
      smtpHost: input.smtpHost ?? null,
      smtpPort: input.smtpPort ?? null,
      smtpSecure: input.smtpSecure ?? true,
      username: input.username ?? null,
      secrets: input.secrets,
    };

    return this.db
      .insertInto('userMailAccounts')
      .values({ userId, ...values })
      .onConflict((oc) =>
        oc.column('userId').doUpdateSet({
          ...values,
          updatedAt: new Date(),
        }),
      )
      .returningAll()
      .executeTakeFirst();
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db
      .deleteFrom('userMailAccounts')
      .where('userId', '=', userId)
      .execute();
  }
}
