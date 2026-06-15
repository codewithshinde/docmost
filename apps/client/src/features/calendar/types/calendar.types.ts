export type CalendarResponseStatus =
  | "accepted"
  | "declined"
  | "tentative"
  | "needsAction";

export type CalendarEventRole = "organizer" | "attendee";

export type CalendarEventVisibility = "default" | "private";

export type CalendarEventStatus = "confirmed" | "cancelled";

export interface ICalendarAttendee {
  userId: string;
  role: CalendarEventRole;
  responseStatus: CalendarResponseStatus;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface ICalendarEvent {
  id: string;
  workspaceId: string;
  organizerId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  visibility: CalendarEventVisibility;
  status: CalendarEventStatus;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  attendees: ICalendarAttendee[];
}
