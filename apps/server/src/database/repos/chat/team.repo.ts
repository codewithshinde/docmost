import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@likh/db/types/kysely.types';
import { dbOrTx } from '@likh/db/utils';
import {
  InsertableTeam,
  Team,
  UpdatableTeam,
} from '@likh/db/types/entity.types';
import { ExpressionBuilder, sql } from 'kysely';
import { DB } from '@likh/db/types/db';

@Injectable()
export class TeamRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async findById(
    teamId: string,
    workspaceId: string,
    opts?: { includeMemberCount?: boolean; trx?: KyselyTransaction },
  ): Promise<Team> {
    const db = dbOrTx(this.db, opts?.trx);

    return db
      .selectFrom('teams')
      .selectAll('teams')
      .$if(opts?.includeMemberCount, (qb) => qb.select(this.withMemberCount))
      .where('id', '=', teamId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async findBySlug(slug: string, workspaceId: string): Promise<Team> {
    return this.db
      .selectFrom('teams')
      .selectAll()
      .where(sql`LOWER(slug)`, '=', sql`LOWER(${slug})`)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async slugExists(
    slug: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<boolean> {
    const db = dbOrTx(this.db, trx);
    const { count } = await db
      .selectFrom('teams')
      .select((eb) => eb.fn.count('id').as('count'))
      .where(sql`LOWER(slug)`, '=', sql`LOWER(${slug})`)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

    return Number(count) > 0;
  }

  async insertTeam(
    insertableTeam: InsertableTeam,
    trx?: KyselyTransaction,
  ): Promise<Team> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('teams')
      .values(insertableTeam)
      .returningAll()
      .executeTakeFirst();
  }

  async updateTeam(
    updatableTeam: UpdatableTeam,
    teamId: string,
    workspaceId: string,
  ): Promise<Team> {
    return this.db
      .updateTable('teams')
      .set({ ...updatableTeam, updatedAt: new Date() })
      .where('id', '=', teamId)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirst();
  }

  async softDeleteTeam(teamId: string, workspaceId: string): Promise<void> {
    await this.db
      .updateTable('teams')
      .set({ deletedAt: new Date() })
      .where('id', '=', teamId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async getUserTeams(userId: string, workspaceId: string) {
    return this.db
      .selectFrom('teams')
      .innerJoin('teamMembers', 'teamMembers.teamId', 'teams.id')
      .selectAll('teams')
      .select('teamMembers.role as memberRole')
      .select((eb) => this.withMemberCount(eb))
      .where('teamMembers.userId', '=', userId)
      .where('teams.workspaceId', '=', workspaceId)
      .where('teams.deletedAt', 'is', null)
      .orderBy('teams.name', 'asc')
      .execute();
  }

  withMemberCount(eb: ExpressionBuilder<DB, 'teams'>) {
    return eb
      .selectFrom('teamMembers')
      .select((eb) => eb.fn.countAll().as('count'))
      .whereRef('teamMembers.teamId', '=', 'teams.id')
      .as('memberCount');
  }
}
