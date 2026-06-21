import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@likh/db/types/kysely.types';
import { dbOrTx } from '@likh/db/utils';
import {
  CalendarEventAttendee,
  InsertableCalendarEventAttendee,
} from '@likh/db/types/entity.types';

@Injectable()
export class CalendarAttendeeRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertAttendee(
    insertableAttendee: InsertableCalendarEventAttendee,
    trx?: KyselyTransaction,
  ): Promise<CalendarEventAttendee> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('calendarEventAttendees')
      .values(insertableAttendee)
      .returningAll()
      .executeTakeFirst();
  }

  async insertAttendees(
    insertableAttendees: InsertableCalendarEventAttendee[],
    trx?: KyselyTransaction,
  ): Promise<CalendarEventAttendee[]> {
    if (insertableAttendees.length === 0) return [];
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('calendarEventAttendees')
      .values(insertableAttendees)
      .returningAll()
      .execute();
  }

  async getAttendees(eventId: string) {
    return this.db
      .selectFrom('calendarEventAttendees')
      .innerJoin('users', 'users.id', 'calendarEventAttendees.userId')
      .select([
        'calendarEventAttendees.id',
        'calendarEventAttendees.eventId',
        'calendarEventAttendees.userId',
        'calendarEventAttendees.role',
        'calendarEventAttendees.responseStatus',
        'users.name',
        'users.email',
        'users.avatarUrl',
      ])
      .where('calendarEventAttendees.eventId', '=', eventId)
      .orderBy('calendarEventAttendees.createdAt', 'asc')
      .execute();
  }

  async getAttendee(
    eventId: string,
    userId: string,
  ): Promise<CalendarEventAttendee> {
    return this.db
      .selectFrom('calendarEventAttendees')
      .selectAll()
      .where('eventId', '=', eventId)
      .where('userId', '=', userId)
      .executeTakeFirst();
  }

  async removeAttendees(
    eventId: string,
    userIds: string[],
    trx?: KyselyTransaction,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const db = dbOrTx(this.db, trx);
    await db
      .deleteFrom('calendarEventAttendees')
      .where('eventId', '=', eventId)
      .where('userId', 'in', userIds)
      .execute();
  }

  async updateResponseStatus(
    eventId: string,
    userId: string,
    responseStatus: string,
  ): Promise<CalendarEventAttendee> {
    return this.db
      .updateTable('calendarEventAttendees')
      .set({ responseStatus, updatedAt: new Date() })
      .where('eventId', '=', eventId)
      .where('userId', '=', userId)
      .returningAll()
      .executeTakeFirst();
  }

  async resetResponseStatus(
    eventId: string,
    userIds: string[],
    trx?: KyselyTransaction,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const db = dbOrTx(this.db, trx);
    await db
      .updateTable('calendarEventAttendees')
      .set({ responseStatus: 'needsAction', updatedAt: new Date() })
      .where('eventId', '=', eventId)
      .where('userId', 'in', userIds)
      .execute();
  }
}
