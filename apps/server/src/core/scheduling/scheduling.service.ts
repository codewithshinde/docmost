import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SchedulingRepo } from '@docmost/db/repos/scheduling/scheduling.repo';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { slugify } from '../../common/helpers/slug.utils';
import {
  CreateBookingDto,
  CreateEventTypeDto,
  GetSlotsDto,
  SaveScheduleDto,
} from './dto/scheduling.dto';

interface AvailabilityRule {
  day: number;
  start: string;
  end: string;
}

@Injectable()
export class SchedulingService {
  constructor(private readonly schedulingRepo: SchedulingRepo) {}

  listSchedules(user: User, workspace: Workspace) {
    return this.schedulingRepo.listSchedules(workspace.id, user.id);
  }

  saveSchedule(dto: SaveScheduleDto, user: User, workspace: Workspace) {
    this.validateRules(dto.rules);
    return this.schedulingRepo.upsertDefaultSchedule({
      workspaceId: workspace.id,
      userId: user.id,
      name: dto.name,
      timeZone: dto.timeZone || 'UTC',
      rules: dto.rules,
    });
  }

  createEventType(dto: CreateEventTypeDto, user: User, workspace: Workspace) {
    return this.schedulingRepo.createEventType({
      workspaceId: workspace.id,
      userId: user.id,
      scheduleId: dto.scheduleId ?? null,
      name: dto.name,
      slug: dto.slug ? slugify(dto.slug) : slugify(dto.name),
      description: dto.description ?? null,
      durationMinutes: dto.durationMinutes,
      minimumNoticeMinutes: dto.minimumNoticeMinutes ?? 60,
    });
  }

  listEventTypes(user: User, workspace: Workspace) {
    return this.schedulingRepo.listEventTypes(workspace.id, user.id);
  }

  async getSlots(dto: GetSlotsDto, workspace: Workspace) {
    const eventType = await this.schedulingRepo.findEventType(
      dto.eventTypeId,
      workspace.id,
    );
    if (!eventType) throw new NotFoundException('Event type not found');
    if (!eventType.scheduleId) {
      throw new BadRequestException('Event type has no schedule');
    }
    const schedule = await this.schedulingRepo.findSchedule(
      eventType.scheduleId,
      workspace.id,
    );
    if (!schedule) throw new NotFoundException('Schedule not found');

    const rangeStart = new Date(dto.start);
    const rangeEnd = new Date(dto.end);
    const minStart = new Date(
      Date.now() + eventType.minimumNoticeMinutes * 60 * 1000,
    );
    const start = rangeStart > minStart ? rangeStart : minStart;
    const bookings = await this.schedulingRepo.listBookingsForRange({
      workspaceId: workspace.id,
      hostUserId: eventType.userId,
      start,
      end: rangeEnd,
    });

    return this.buildSlots({
      rules: schedule.rules as unknown as AvailabilityRule[],
      start,
      end: rangeEnd,
      durationMinutes: eventType.durationMinutes,
      existing: bookings.map((booking) => ({
        start: booking.startsAt,
        end: booking.endsAt,
      })),
    });
  }

  async createBooking(dto: CreateBookingDto, workspace: Workspace) {
    const eventType = await this.schedulingRepo.findEventType(
      dto.eventTypeId,
      workspace.id,
    );
    if (!eventType || !eventType.enabled) {
      throw new NotFoundException('Event type not found');
    }
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(
      startsAt.getTime() + eventType.durationMinutes * 60 * 1000,
    );
    const conflicts = await this.schedulingRepo.listBookingsForRange({
      workspaceId: workspace.id,
      hostUserId: eventType.userId,
      start: startsAt,
      end: endsAt,
    });
    if (conflicts.length > 0) {
      throw new BadRequestException('Selected time is no longer available');
    }
    return this.schedulingRepo.createBooking({
      workspaceId: workspace.id,
      eventTypeId: eventType.id,
      hostUserId: eventType.userId,
      bookerName: dto.bookerName,
      bookerEmail: dto.bookerEmail,
      startsAt,
      endsAt,
      notes: dto.notes ?? null,
    });
  }

  private buildSlots(input: {
    rules: AvailabilityRule[];
    start: Date;
    end: Date;
    durationMinutes: number;
    existing: { start: Date; end: Date }[];
  }) {
    const slots: { startsAt: string; endsAt: string }[] = [];
    const cursor = new Date(input.start);
    cursor.setUTCMinutes(Math.ceil(cursor.getUTCMinutes() / 15) * 15, 0, 0);

    while (cursor < input.end) {
      const rule = input.rules.find((r) => r.day === cursor.getUTCDay());
      if (rule && this.withinRule(cursor, input.durationMinutes, rule)) {
        const slotEnd = new Date(
          cursor.getTime() + input.durationMinutes * 60 * 1000,
        );
        const conflicts = input.existing.some(
          (b) => cursor < b.end && slotEnd > b.start,
        );
        if (!conflicts) {
          slots.push({
            startsAt: cursor.toISOString(),
            endsAt: slotEnd.toISOString(),
          });
        }
      }
      cursor.setUTCMinutes(cursor.getUTCMinutes() + 15);
    }
    return slots;
  }

  private withinRule(date: Date, durationMinutes: number, rule: AvailabilityRule) {
    const [startHour, startMinute] = rule.start.split(':').map(Number);
    const [endHour, endMinute] = rule.end.split(':').map(Number);
    const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
    const end = minutes + durationMinutes;
    const ruleStart = startHour * 60 + startMinute;
    const ruleEnd = endHour * 60 + endMinute;
    return minutes >= ruleStart && end <= ruleEnd;
  }

  private validateRules(rules: AvailabilityRule[]) {
    for (const rule of rules) {
      if (rule.day < 0 || rule.day > 6) {
        throw new BadRequestException('Availability day must be 0-6');
      }
      if (!/^\d{2}:\d{2}$/.test(rule.start) || !/^\d{2}:\d{2}$/.test(rule.end)) {
        throw new BadRequestException('Availability times must be HH:mm');
      }
    }
  }
}
