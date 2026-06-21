import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@likh/db/types/kysely.types';
import { dbOrTx } from '@likh/db/utils';
import {
  InsertableTeamMember,
  TeamMember,
} from '@likh/db/types/entity.types';
import { jsonObjectFrom } from 'kysely/helpers/postgres';

@Injectable()
export class TeamMemberRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertTeamMember(
    insertableTeamMember: InsertableTeamMember,
    trx?: KyselyTransaction,
  ): Promise<TeamMember> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('teamMembers')
      .values(insertableTeamMember)
      .returningAll()
      .executeTakeFirst();
  }

  async getTeamMember(teamId: string, userId: string): Promise<TeamMember> {
    return this.db
      .selectFrom('teamMembers')
      .selectAll()
      .where('teamId', '=', teamId)
      .where('userId', '=', userId)
      .executeTakeFirst();
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await this.db
      .deleteFrom('teamMembers')
      .where('teamId', '=', teamId)
      .where('userId', '=', userId)
      .execute();
  }

  async updateRole(
    teamId: string,
    userId: string,
    role: string,
  ): Promise<TeamMember> {
    return this.db
      .updateTable('teamMembers')
      .set({ role })
      .where('teamId', '=', teamId)
      .where('userId', '=', userId)
      .returningAll()
      .executeTakeFirst();
  }

  async getTeamMembers(teamId: string) {
    return this.db
      .selectFrom('teamMembers')
      .select((eb) => [
        'teamMembers.id',
        'teamMembers.teamId',
        'teamMembers.userId',
        'teamMembers.role',
        'teamMembers.createdAt',
        jsonObjectFrom(
          eb
            .selectFrom('users')
            .select([
              'users.id',
              'users.name',
              'users.email',
              'users.avatarUrl',
            ])
            .whereRef('users.id', '=', 'teamMembers.userId'),
        ).as('user'),
      ])
      .where('teamMembers.teamId', '=', teamId)
      .orderBy('teamMembers.createdAt', 'asc')
      .execute();
  }

  async getUserTeamIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('teamMembers')
      .select('teamId')
      .where('userId', '=', userId)
      .execute();
    return rows.map((row) => row.teamId);
  }

  async roleCountByTeamId(teamId: string, role: string): Promise<number> {
    const { count } = await this.db
      .selectFrom('teamMembers')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('teamId', '=', teamId)
      .where('role', '=', role)
      .executeTakeFirst();

    return Number(count);
  }
}
