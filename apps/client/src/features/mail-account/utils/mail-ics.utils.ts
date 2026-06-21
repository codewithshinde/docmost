export interface IcsEventData {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  allDay?: boolean;
  organizerEmail?: string;
  attendeeEmails?: string[];
  method?: "REQUEST" | "REPLY" | "CANCEL";
}

export function generateIcs(event: IcsEventData): string {
  const method = event.method ?? "REQUEST";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Likh//Calendar//EN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `DTSTAMP:${formatIcsDateTime(new Date())}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.startsAt)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(event.endsAt)}`);
  } else {
    lines.push(`DTSTART:${formatIcsDateTime(event.startsAt)}`);
    lines.push(`DTEND:${formatIcsDateTime(event.endsAt)}`);
  }

  if (event.description) lines.push(`DESCRIPTION:${icsEscape(event.description)}`);
  if (event.location) lines.push(`LOCATION:${icsEscape(event.location)}`);
  if (event.organizerEmail) lines.push(`ORGANIZER:mailto:${event.organizerEmail}`);
  for (const email of event.attendeeEmails ?? []) {
    lines.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${email}`);
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatIcsDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function formatIcsDateTime(d: Date): string {
  return `${formatIcsDate(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
