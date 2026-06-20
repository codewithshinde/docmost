import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  CalendarEvent,
  InsertableCalendarEvent,
  UpdatableCalendarEvent,
} from '@docmost/db/types/entity.types';
import { jsonArrayFrom } from 'kysely/helpers/postgres';

@Injectable()
export class CalendarEventRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertEvent(
    insertableEvent: InsertableCalendarEvent,
    trx?: KyselyTransaction,
  ): Promise<CalendarEvent> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('calendarEvents')
      .values(insertableEvent)
      .returningAll()
      .executeTakeFirst();
  }

  async updateEvent(
    eventId: string,
    workspaceId: string,
    updatableEvent: UpdatableCalendarEvent,
    trx?: KyselyTransaction,
  ): Promise<CalendarEvent> {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('calendarEvents')
      .set({ ...updatableEvent, updatedAt: new Date() })
      .where('id', '=', eventId)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirst();
  }

  async findById(
    eventId: string,
    workspaceId: string,
  ): Promise<CalendarEvent> {
    return this.db
      .selectFrom('calendarEvents')
      .selectAll()
      .where('id', '=', eventId)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async findByIdWithAttendees(eventId: string, workspaceId: string) {
    return this.db
      .selectFrom('calendarEvents')
      .selectAll('calendarEvents')
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom('calendarEventAttendees')
            .innerJoin('users', 'users.id', 'calendarEventAttendees.userId')
            .select([
              'calendarEventAttendees.userId',
              'calendarEventAttendees.role',
              'calendarEventAttendees.responseStatus',
              'users.name',
              'users.email',
              'users.avatarUrl',
            ])
            .whereRef(
              'calendarEventAttendees.eventId',
              '=',
              'calendarEvents.id',
            )
            .orderBy('calendarEventAttendees.createdAt', 'asc'),
        ).as('attendees'),
      ])
      .where('calendarEvents.id', '=', eventId)
      .where('calendarEvents.workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async findByExternalUid(
    externalUid: string,
    workspaceId: string,
  ): Promise<CalendarEvent | undefined> {
    return this.db
      .selectFrom('calendarEvents')
      .selectAll()
      .where('externalUid', '=', externalUid)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async update(
    eventId: string,
    workspaceId: string,
    data: Partial<UpdatableCalendarEvent>,
  ): Promise<CalendarEvent> {
    return this.db
      .updateTable('calendarEvents')
      .set({ ...data, updatedAt: new Date() })
      .where('id', '=', eventId)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirst();
  }

  async findEventsInRange(
    userId: string,
    workspaceId: string,
    start: Date,
    end: Date,
  ) {
    return this.db
      .selectFrom('calendarEvents')
      .selectAll('calendarEvents')
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom('calendarEventAttendees')
            .innerJoin('users', 'users.id', 'calendarEventAttendees.userId')
            .select([
              'calendarEventAttendees.userId',
              'calendarEventAttendees.role',
              'calendarEventAttendees.responseStatus',
              'users.name',
              'users.email',
              'users.avatarUrl',
            ])
            .whereRef(
              'calendarEventAttendees.eventId',
              '=',
              'calendarEvents.id',
            )
            .orderBy('calendarEventAttendees.createdAt', 'asc'),
        ).as('attendees'),
      ])
      .where('calendarEvents.workspaceId', '=', workspaceId)
      .where('calendarEvents.startsAt', '<', end)
      .where('calendarEvents.endsAt', '>', start)
      .where((eb) =>
        eb.or([
          eb('calendarEvents.organizerId', '=', userId),
          eb.exists(
            eb
              .selectFrom('calendarEventAttendees')
              .select('calendarEventAttendees.id')
              .whereRef(
                'calendarEventAttendees.eventId',
                '=',
                'calendarEvents.id',
              )
              .where('calendarEventAttendees.userId', '=', userId),
          ),
        ]),
      )
      .orderBy('calendarEvents.startsAt', 'asc')
      .execute();
  }
}
