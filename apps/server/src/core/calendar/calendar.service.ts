import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { executeTx } from '@docmost/db/utils';
import { CalendarEventRepo } from '@docmost/db/repos/calendar/calendar-event.repo';
import { CalendarAttendeeRepo } from '@docmost/db/repos/calendar/calendar-attendee.repo';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { ChatWsService } from '../../ws/chat-ws.service';
import { ChatWsEvent } from '../../ws/chat-ws.constants';
import { IntegrationSettingsService } from '../../integrations/integration/integration-settings.service';
import { CalendarNotificationService } from '../notification/services/calendar.notification';
import {
  CreateCalendarEventDto,
  EventIdDto,
  ListCalendarEventsDto,
  RespondCalendarEventDto,
  UpdateCalendarEventDto,
} from './dto/calendar.dto';

@Injectable()
export class CalendarService {
  constructor(
    private readonly calendarEventRepo: CalendarEventRepo,
    private readonly calendarAttendeeRepo: CalendarAttendeeRepo,
    private readonly userRepo: UserRepo,
    private readonly chatWsService: ChatWsService,
    private readonly integrationSettingsService: IntegrationSettingsService,
    private readonly calendarNotificationService: CalendarNotificationService,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async listEvents(
    dto: ListCalendarEventsDto,
    user: User,
    workspace: Workspace,
  ) {
    return this.calendarEventRepo.findEventsInRange(
      user.id,
      workspace.id,
      new Date(dto.start),
      new Date(dto.end),
    );
  }

  async getEventById(dto: EventIdDto, user: User, workspace: Workspace) {
    const event = await this.calendarEventRepo.findByIdWithAttendees(
      dto.eventId,
      workspace.id,
    );
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.assertCanView(event, user.id);
    return event;
  }

  async createEvent(
    dto: CreateCalendarEventDto,
    user: User,
    workspace: Workspace,
  ) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (startsAt >= endsAt) {
      throw new BadRequestException('End time must be after start time');
    }

    const attendeeUserIds = await this.resolveAttendeeIds(
      dto.attendeeUserIds,
      user.id,
      workspace.id,
    );

    const eventId = await executeTx(this.db, async (trx) => {
      const event = await this.calendarEventRepo.insertEvent(
        {
          workspaceId: workspace.id,
          organizerId: user.id,
          title: dto.title,
          description: dto.description ?? null,
          location: dto.location ?? null,
          startsAt,
          endsAt,
          allDay: dto.allDay ?? false,
          visibility: dto.visibility ?? 'default',
          color: dto.color ?? null,
        },
        trx,
      );

      await this.calendarAttendeeRepo.insertAttendee(
        {
          eventId: event.id,
          userId: user.id,
          role: 'organizer',
          responseStatus: 'accepted',
        },
        trx,
      );

      if (attendeeUserIds.length > 0) {
        await this.calendarAttendeeRepo.insertAttendees(
          attendeeUserIds.map((userId) => ({
            eventId: event.id,
            userId,
            role: 'attendee',
            responseStatus: 'needsAction',
          })),
          trx,
        );
      }

      return event.id;
    });

    if (dto.addVideoCall) {
      const meetingUrl = await this.buildMeetingUrl(workspace.id, eventId);
      if (meetingUrl) {
        await this.calendarEventRepo.updateEvent(eventId, workspace.id, {
          meetingUrl,
        });
      }
    }

    const event = await this.calendarEventRepo.findByIdWithAttendees(
      eventId,
      workspace.id,
    );

    if (attendeeUserIds.length > 0) {
      this.chatWsService.emitToUsers(
        [user.id, ...attendeeUserIds],
        ChatWsEvent.CALENDAR_EVENT_CREATED,
        event,
      );

      await this.calendarNotificationService.notifyEventInvite(
        {
          eventId: event.id,
          workspaceId: workspace.id,
          actorId: user.id,
          title: event.title,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          allDay: event.allDay,
          location: event.location,
          meetingUrl: event.meetingUrl,
        },
        attendeeUserIds,
      );
    }

    return event;
  }

  async updateEvent(
    dto: UpdateCalendarEventDto,
    user: User,
    workspace: Workspace,
  ) {
    const existing = await this.calendarEventRepo.findById(
      dto.eventId,
      workspace.id,
    );
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (existing.organizerId !== user.id) {
      throw new ForbiddenException('Only the organizer can update this event');
    }
    if (existing.status === 'cancelled') {
      throw new BadRequestException('Cannot update a cancelled event');
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    if (startsAt >= endsAt) {
      throw new BadRequestException('End time must be after start time');
    }

    const currentAttendees = await this.calendarAttendeeRepo.getAttendees(
      dto.eventId,
    );
    const currentAttendeeIds = new Set(
      currentAttendees
        .filter((a) => a.role !== 'organizer')
        .map((a) => a.userId),
    );

    let newAttendeeIds: string[] = [];
    let removedAttendeeIds: string[] = [];

    if (dto.attendeeUserIds) {
      const desiredAttendeeIds = new Set(
        await this.resolveAttendeeIds(
          dto.attendeeUserIds,
          user.id,
          workspace.id,
        ),
      );

      newAttendeeIds = [...desiredAttendeeIds].filter(
        (id) => !currentAttendeeIds.has(id),
      );
      removedAttendeeIds = [...currentAttendeeIds].filter(
        (id) => !desiredAttendeeIds.has(id),
      );
    }

    let meetingUrl = existing.meetingUrl;
    if (dto.addVideoCall === true && !meetingUrl) {
      meetingUrl = await this.buildMeetingUrl(workspace.id, dto.eventId);
    } else if (dto.addVideoCall === false) {
      meetingUrl = null;
    }

    await executeTx(this.db, async (trx) => {
      await this.calendarEventRepo.updateEvent(
        dto.eventId,
        workspace.id,
        {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.location !== undefined && { location: dto.location }),
          startsAt,
          endsAt,
          ...(dto.allDay !== undefined && { allDay: dto.allDay }),
          ...(dto.visibility !== undefined && { visibility: dto.visibility }),
          ...(dto.color !== undefined && { color: dto.color }),
          meetingUrl,
        },
        trx,
      );

      if (removedAttendeeIds.length > 0) {
        await this.calendarAttendeeRepo.removeAttendees(
          dto.eventId,
          removedAttendeeIds,
          trx,
        );
      }

      if (newAttendeeIds.length > 0) {
        await this.calendarAttendeeRepo.insertAttendees(
          newAttendeeIds.map((userId) => ({
            eventId: dto.eventId,
            userId,
            role: 'attendee',
            responseStatus: 'needsAction',
          })),
          trx,
        );
      }
    });

    const event = await this.calendarEventRepo.findByIdWithAttendees(
      dto.eventId,
      workspace.id,
    );

    const updatedAttendeeIds = [...currentAttendeeIds].filter(
      (id) => !removedAttendeeIds.includes(id),
    );

    const context = {
      eventId: event.id,
      workspaceId: workspace.id,
      actorId: user.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      allDay: event.allDay,
      location: event.location,
      meetingUrl: event.meetingUrl,
    };

    if (updatedAttendeeIds.length > 0) {
      this.chatWsService.emitToUsers(
        [user.id, ...updatedAttendeeIds],
        ChatWsEvent.CALENDAR_EVENT_UPDATED,
        event,
      );
      await this.calendarNotificationService.notifyEventUpdated(
        context,
        updatedAttendeeIds,
      );
    }

    if (newAttendeeIds.length > 0) {
      this.chatWsService.emitToUsers(
        newAttendeeIds,
        ChatWsEvent.CALENDAR_EVENT_CREATED,
        event,
      );
      await this.calendarNotificationService.notifyEventInvite(
        context,
        newAttendeeIds,
      );
    }

    if (removedAttendeeIds.length > 0) {
      this.chatWsService.emitToUsers(
        removedAttendeeIds,
        ChatWsEvent.CALENDAR_EVENT_CANCELLED,
        { id: event.id },
      );
    }

    return event;
  }

  async deleteEvent(dto: EventIdDto, user: User, workspace: Workspace) {
    const existing = await this.calendarEventRepo.findById(
      dto.eventId,
      workspace.id,
    );
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (existing.organizerId !== user.id) {
      throw new ForbiddenException('Only the organizer can cancel this event');
    }

    if (existing.status !== 'cancelled') {
      await this.calendarEventRepo.updateEvent(dto.eventId, workspace.id, {
        status: 'cancelled',
      });

      const attendees = await this.calendarAttendeeRepo.getAttendees(
        dto.eventId,
      );
      const attendeeUserIds = attendees
        .filter((a) => a.role !== 'organizer')
        .map((a) => a.userId);

      this.chatWsService.emitToUsers(
        [user.id, ...attendeeUserIds],
        ChatWsEvent.CALENDAR_EVENT_CANCELLED,
        { id: dto.eventId },
      );

      if (attendeeUserIds.length > 0) {
        await this.calendarNotificationService.notifyEventCancelled(
          {
            eventId: existing.id,
            workspaceId: workspace.id,
            actorId: user.id,
            title: existing.title,
            startsAt: existing.startsAt,
            endsAt: existing.endsAt,
            allDay: existing.allDay,
            location: existing.location,
            meetingUrl: existing.meetingUrl,
          },
          attendeeUserIds,
        );
      }
    }

    return { success: true };
  }

  async respondToEvent(
    dto: RespondCalendarEventDto,
    user: User,
    workspace: Workspace,
  ) {
    const existing = await this.calendarEventRepo.findById(
      dto.eventId,
      workspace.id,
    );
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (existing.status === 'cancelled') {
      throw new BadRequestException('This event has been cancelled');
    }

    const attendee = await this.calendarAttendeeRepo.getAttendee(
      dto.eventId,
      user.id,
    );
    if (!attendee) {
      throw new ForbiddenException('You are not invited to this event');
    }

    await this.calendarAttendeeRepo.updateResponseStatus(
      dto.eventId,
      user.id,
      dto.responseStatus,
    );

    const event = await this.calendarEventRepo.findByIdWithAttendees(
      dto.eventId,
      workspace.id,
    );

    const participantIds = (event.attendees as { userId: string }[]).map(
      (a) => a.userId,
    );

    this.chatWsService.emitToUsers(
      participantIds,
      ChatWsEvent.CALENDAR_EVENT_RESPONSE_UPDATED,
      event,
    );

    const recipientIds = participantIds.filter((id) => id !== user.id);
    if (recipientIds.length > 0) {
      await this.calendarNotificationService.notifyEventResponse(
        {
          eventId: event.id,
          workspaceId: workspace.id,
          actorId: user.id,
          title: event.title,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          allDay: event.allDay,
          location: event.location,
          meetingUrl: event.meetingUrl,
        },
        dto.responseStatus,
        recipientIds,
      );
    }

    return event;
  }

  private assertCanView(
    event: { organizerId: string; attendees: { userId: string }[] },
    userId: string,
  ): void {
    if (event.organizerId === userId) return;
    if (event.attendees.some((a) => a.userId === userId)) return;
    throw new ForbiddenException('You do not have access to this event');
  }

  private async resolveAttendeeIds(
    attendeeUserIds: string[] | undefined,
    organizerId: string,
    workspaceId: string,
  ): Promise<string[]> {
    if (!attendeeUserIds || attendeeUserIds.length === 0) return [];

    const uniqueIds = [...new Set(attendeeUserIds)].filter(
      (id) => id !== organizerId,
    );

    const validIds: string[] = [];
    for (const userId of uniqueIds) {
      const targetUser = await this.userRepo.findById(userId, workspaceId);
      if (targetUser) {
        validIds.push(userId);
      }
    }
    return validIds;
  }

  private async buildMeetingUrl(
    workspaceId: string,
    eventId: string,
  ): Promise<string | null> {
    const runtime =
      await this.integrationSettingsService.getCallRuntimeConfig(workspaceId);
    if (!runtime.jitsiDomain) return null;
    return `https://${runtime.jitsiDomain}/${workspaceId}-${eventId}`;
  }
}
