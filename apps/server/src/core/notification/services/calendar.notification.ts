import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { NotificationService } from '../notification.service';
import { NotificationType } from '../notification.constants';
import { EnvironmentService } from '../../../integrations/environment/environment.service';
import { MeetingInviteEmail } from '@docmost/transactional/emails/meeting-invite-email';

export interface CalendarEventNotificationContext {
  eventId: string;
  workspaceId: string;
  actorId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  location?: string | null;
  meetingUrl?: string | null;
}

@Injectable()
export class CalendarNotificationService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly notificationService: NotificationService,
    private readonly environmentService: EnvironmentService,
  ) {}

  async notifyEventInvite(
    context: CalendarEventNotificationContext,
    recipientUserIds: string[],
  ): Promise<void> {
    await this.notify(
      context,
      recipientUserIds,
      NotificationType.CALENDAR_EVENT_INVITE,
      'invited you to',
    );
  }

  async notifyEventUpdated(
    context: CalendarEventNotificationContext,
    recipientUserIds: string[],
  ): Promise<void> {
    await this.notify(
      context,
      recipientUserIds,
      NotificationType.CALENDAR_EVENT_UPDATED,
      'updated the meeting',
    );
  }

  async notifyEventCancelled(
    context: CalendarEventNotificationContext,
    recipientUserIds: string[],
  ): Promise<void> {
    await this.notify(
      context,
      recipientUserIds,
      NotificationType.CALENDAR_EVENT_CANCELLED,
      'cancelled the meeting',
    );
  }

  async notifyEventResponse(
    context: CalendarEventNotificationContext,
    responseStatus: string,
    recipientUserIds: string[],
  ): Promise<void> {
    await this.notify(
      context,
      recipientUserIds,
      NotificationType.CALENDAR_EVENT_RESPONSE,
      `${this.responseVerb(responseStatus)} your invite for`,
    );
  }

  private responseVerb(status: string): string {
    switch (status) {
      case 'accepted':
        return 'accepted';
      case 'declined':
        return 'declined';
      case 'tentative':
        return 'tentatively accepted';
      default:
        return 'responded to';
    }
  }

  private async notify(
    context: CalendarEventNotificationContext,
    recipientUserIds: string[],
    type: NotificationType,
    actionText: string,
  ): Promise<void> {
    const recipients = [...new Set(recipientUserIds)].filter(
      (id) => id !== context.actorId,
    );
    if (recipients.length === 0) return;

    const actor = await this.db
      .selectFrom('users')
      .select(['id', 'name'])
      .where('id', '=', context.actorId)
      .executeTakeFirst();
    if (!actor) return;

    const whenLabel = this.formatWhen(
      context.startsAt,
      context.endsAt,
      context.allDay,
    );
    const calendarUrl = `${this.environmentService.getAppUrl()}/calendar`;

    for (const userId of recipients) {
      const notification = await this.notificationService.create({
        userId,
        workspaceId: context.workspaceId,
        type,
        actorId: context.actorId,
        data: { eventId: context.eventId },
      });
      if (!notification) continue;

      await this.notificationService.queueEmail(
        userId,
        notification.id,
        `${actor.name} ${actionText} ${context.title}`,
        MeetingInviteEmail({
          actorName: actor.name,
          actionText,
          eventTitle: context.title,
          whenLabel,
          location: context.location ?? undefined,
          meetingUrl: context.meetingUrl ?? undefined,
          calendarUrl,
        }),
        type,
      );
    }
  }

  private formatWhen(startsAt: Date, endsAt: Date, allDay: boolean): string {
    if (allDay) {
      const dateFmt = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeZone: 'UTC',
      });
      return `When: ${dateFmt.format(startsAt)} (all day)`;
    }

    const dateTimeFmt = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'UTC',
    });
    const timeFmt = new Intl.DateTimeFormat('en-US', {
      timeStyle: 'short',
      timeZone: 'UTC',
    });
    return `When: ${dateTimeFmt.format(startsAt)} - ${timeFmt.format(endsAt)} UTC`;
  }
}
