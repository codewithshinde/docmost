import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';

@Injectable()
export class SchedulingRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  listSchedules(workspaceId: string, userId: string) {
    return this.db
      .selectFrom('availabilitySchedules')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  upsertDefaultSchedule(input: {
    workspaceId: string;
    userId: string;
    name: string;
    timeZone: string;
    rules: any[];
  }) {
    return this.db
      .insertInto('availabilitySchedules')
      .values({ ...input, rules: JSON.stringify(input.rules) } as any)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  createEventType(input: {
    workspaceId: string;
    userId: string;
    scheduleId?: string | null;
    name: string;
    slug: string;
    description?: string | null;
    durationMinutes: number;
    minimumNoticeMinutes: number;
  }) {
    return this.db
      .insertInto('eventTypes')
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  listEventTypes(workspaceId: string, userId: string) {
    return this.db
      .selectFrom('eventTypes')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('userId', '=', userId)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  findEventType(eventTypeId: string, workspaceId: string) {
    return this.db
      .selectFrom('eventTypes')
      .selectAll()
      .where('id', '=', eventTypeId)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async findSchedule(scheduleId: string, workspaceId: string) {
    return this.db
      .selectFrom('availabilitySchedules')
      .selectAll()
      .where('id', '=', scheduleId)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  listBookingsForRange(input: {
    workspaceId: string;
    hostUserId: string;
    start: Date;
    end: Date;
  }) {
    return this.db
      .selectFrom('bookings')
      .leftJoin('eventTypes', 'eventTypes.id', 'bookings.eventTypeId')
      .selectAll('bookings')
      .select('eventTypes.name as eventTypeName')
      .where('bookings.workspaceId', '=', input.workspaceId)
      .where('bookings.hostUserId', '=', input.hostUserId)
      .where('bookings.status', '!=', 'cancelled')
      .where('bookings.startsAt', '<', input.end)
      .where('bookings.endsAt', '>', input.start)
      .orderBy('bookings.startsAt', 'asc')
      .execute();
  }

  createBooking(input: {
    workspaceId: string;
    eventTypeId: string;
    hostUserId: string;
    bookerName: string;
    bookerEmail: string;
    startsAt: Date;
    endsAt: Date;
    notes?: string | null;
  }) {
    return this.db
      .insertInto('bookings')
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
