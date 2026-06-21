import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { MailAccountRepo } from '@likh/db/repos/mail-account/mail-account.repo';
import { EncryptionService } from '../../integrations/crypto/encryption.service';
import {
  GetMailMessageDto,
  ListMailMessagesDto,
  SaveMailAccountDto,
  SendMailMessageDto,
} from './dto/mail-account.dto';

export interface MailAccountView {
  emailAddress: string | null;
  imapHost: string | null;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  username: string | null;
  configured: boolean;
}

export interface MailMessageSummary {
  uid: number;
  subject: string;
  from: string;
  fromName: string;
  date: Date | null;
  seen: boolean;
}

export interface MailCalendarInvite {
  uid: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  organizerEmail: string | null;
  attendeeEmails: string[];
  meetingUrl: string | null;
  method: string;
}

export interface MailMessageDetail {
  uid: number;
  messageId: string | null;
  subject: string;
  from: string;
  to: string;
  date: Date | null;
  html: string | null;
  text: string | null;
  calendarInvite: MailCalendarInvite | null;
}

@Injectable()
export class MailAccountService {
  constructor(
    private readonly mailAccountRepo: MailAccountRepo,
    private readonly encryption: EncryptionService,
  ) {}

  async getView(userId: string): Promise<MailAccountView> {
    const row = await this.mailAccountRepo.findByUserId(userId);
    const secrets = this.encryption.decryptJson(row?.secrets);

    return {
      emailAddress: row?.emailAddress ?? null,
      imapHost: row?.imapHost ?? null,
      imapPort: row?.imapPort ?? 993,
      imapSecure: row?.imapSecure ?? true,
      smtpHost: row?.smtpHost ?? null,
      smtpPort: row?.smtpPort ?? null,
      smtpSecure: row?.smtpSecure ?? true,
      username: row?.username ?? null,
      configured: Boolean(row?.emailAddress && row?.imapHost && secrets.password),
    };
  }

  async save(userId: string, dto: SaveMailAccountDto): Promise<MailAccountView> {
    const existing = await this.mailAccountRepo.findByUserId(userId);
    const existingSecrets = this.encryption.decryptJson(existing?.secrets);

    const secrets = { ...existingSecrets };
    if (dto.password) {
      secrets.password = dto.password;
    }

    await this.mailAccountRepo.upsert(userId, {
      emailAddress: dto.emailAddress,
      imapHost: dto.imapHost,
      imapPort: dto.imapPort,
      imapSecure: dto.imapSecure,
      smtpHost: dto.smtpHost,
      smtpPort: dto.smtpPort,
      smtpSecure: dto.smtpSecure,
      username: dto.username,
      secrets: this.encryption.encryptJson(secrets),
    });

    return this.getView(userId);
  }

  async delete(userId: string): Promise<void> {
    await this.mailAccountRepo.deleteByUserId(userId);
  }

  private async connect(userId: string): Promise<ImapFlow> {
    const account = await this.mailAccountRepo.findByUserId(userId);
    if (!account) {
      throw new BadRequestException('Email account is not configured');
    }

    const secrets = this.encryption.decryptJson(account.secrets);
    if (!secrets.password) {
      throw new BadRequestException('Email account is not configured');
    }

    const client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapSecure,
      auth: {
        user: account.username || account.emailAddress,
        pass: secrets.password,
      },
      logger: false,
    });

    await client.connect();
    return client;
  }

  async testConnection(userId: string): Promise<{ ok: boolean; message: string }> {
    let client: ImapFlow | null = null;
    try {
      client = await this.connect(userId);
      return { ok: true, message: 'Successfully connected to IMAP server' };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'IMAP connection failed',
      };
    } finally {
      if (client) await client.logout().catch(() => {});
    }
  }

  async listMessages(
    userId: string,
    dto: ListMailMessagesDto,
  ): Promise<{ messages: MailMessageSummary[]; total: number }> {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 25;

    const client = await this.connect(userId);
    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const total = client.mailbox ? client.mailbox.exists : 0;
        const end = total - (page - 1) * pageSize;
        const start = end - pageSize + 1;

        const messages: MailMessageSummary[] = [];
        if (end >= 1) {
          const range = `${Math.max(start, 1)}:${end}`;
          for await (const message of client.fetch(range, {
            uid: true,
            envelope: true,
            flags: true,
          })) {
            messages.push({
              uid: message.uid,
              subject: message.envelope?.subject ?? '(no subject)',
              from: message.envelope?.from?.[0]?.address ?? '',
              fromName: message.envelope?.from?.[0]?.name ?? '',
              date: message.envelope?.date ?? null,
              seen: message.flags?.has('\\Seen') ?? false,
            });
          }
        }

        messages.sort((a, b) => b.uid - a.uid);
        return { messages, total };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }

  async getMessage(userId: string, dto: GetMailMessageDto): Promise<MailMessageDetail> {
    const client = await this.connect(userId);
    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const message = await client.fetchOne(
          String(dto.uid),
          { source: true },
          { uid: true },
        );

        if (!message || !message.source) {
          throw new NotFoundException('Message not found');
        }

        const parsed = await simpleParser(message.source);
        const to = Array.isArray(parsed.to)
          ? parsed.to.map((addr) => addr.text).join(', ')
          : parsed.to?.text ?? '';

        let calendarInvite: MailCalendarInvite | null = null;
        const icsTexts: string[] = [];
        if (parsed.text && parsed.text.includes('BEGIN:VCALENDAR')) {
          icsTexts.push(parsed.text);
        }
        for (const att of parsed.attachments ?? []) {
          const isIcs = att.contentType === 'text/calendar' || att.filename?.endsWith('.ics');
          if (isIcs && att.content) {
            icsTexts.push(att.content.toString('utf8'));
          }
        }
        if (icsTexts.length > 0) {
          calendarInvite = parseCalendarInviteFromIcs(icsTexts[0]);
        }

        return {
          uid: dto.uid,
          messageId: parsed.messageId ?? null,
          subject: parsed.subject ?? '(no subject)',
          from: parsed.from?.text ?? '',
          to,
          date: parsed.date ?? null,
          html: parsed.html || null,
          text: parsed.text || null,
          calendarInvite,
        };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }

  async getUnreadCount(userId: string): Promise<{ unread: number }> {
    const client = await this.connect(userId);
    try {
      const status = await client.status('INBOX', { unseen: true });
      return { unread: status.unseen ?? 0 };
    } finally {
      await client.logout().catch(() => {});
    }
  }

  private async getTransport(userId: string): Promise<{
    transporter: Transporter;
    from: string;
  }> {
    const account = await this.mailAccountRepo.findByUserId(userId);
    if (!account) {
      throw new BadRequestException('Email account is not configured');
    }

    const secrets = this.encryption.decryptJson(account.secrets);
    if (!secrets.password) {
      throw new BadRequestException('Email account is not configured');
    }

    const host = account.smtpHost || account.imapHost;
    const port = account.smtpPort ?? 587;
    const secure = account.smtpHost
      ? account.smtpSecure ?? true
      : account.imapSecure;

    if (!host) {
      throw new BadRequestException('SMTP is not configured for this account');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: account.username || account.emailAddress,
        pass: secrets.password,
      },
    });

    return { transporter, from: account.emailAddress };
  }

  async testSmtpConnection(userId: string): Promise<{ ok: boolean; message: string }> {
    try {
      const { transporter } = await this.getTransport(userId);
      await transporter.verify();
      return { ok: true, message: 'Successfully connected to SMTP server' };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'SMTP connection failed',
      };
    }
  }

  async sendMessage(userId: string, dto: SendMailMessageDto): Promise<{ ok: true }> {
    const { transporter, from } = await this.getTransport(userId);

    await transporter.sendMail({
      from,
      to: dto.to,
      cc: dto.cc,
      bcc: dto.bcc,
      subject: dto.subject,
      html: dto.html,
      text: dto.text,
      inReplyTo: dto.inReplyTo,
      references: dto.references,
      attachments: dto.icsAttachment
        ? [
            {
              filename: 'invite.ics',
              content: dto.icsAttachment,
              contentType: 'text/calendar; method=REQUEST; charset=UTF-8',
              contentDisposition: 'attachment',
            },
          ]
        : [],
    });

    return { ok: true };
  }

  async syncCalendarFromImap(
    userId: string,
  ): Promise<ParsedCalendarEvent[]> {
    const client = await this.connect(userId);
    const events: ParsedCalendarEvent[] = [];

    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const total = client.mailbox ? client.mailbox.exists : 0;
        if (total === 0) return events;

        // Only scan the most recent 200 messages to keep it fast
        const start = Math.max(1, total - 199);
        const range = `${start}:${total}`;

        for await (const message of client.fetch(range, { source: true })) {
          if (!message.source) continue;
          try {
            const parsed = await simpleParser(message.source);

            // Check body text/calendar
            const bodyParts: string[] = [];
            if (parsed.text && parsed.text.includes('BEGIN:VCALENDAR')) {
              bodyParts.push(parsed.text);
            }

            // Check attachments for .ics files
            for (const att of parsed.attachments ?? []) {
              const isIcs =
                att.contentType === 'text/calendar' ||
                att.filename?.endsWith('.ics');
              if (isIcs && att.content) {
                bodyParts.push(att.content.toString('utf8'));
              }
            }

            for (const icsText of bodyParts) {
              const parsed = parseIcsEvents(icsText);
              events.push(...parsed);
            }
          } catch {
            // skip unparseable messages
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }

    // Deduplicate by uid
    const seen = new Set<string>();
    return events.filter((e) => {
      if (!e.uid || seen.has(e.uid)) return false;
      seen.add(e.uid);
      return true;
    });
  }
}

export interface ParsedCalendarEvent {
  uid: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  organizerEmail: string | null;
  attendeeEmails: string[];
  meetingUrl: string | null;
}

function parseCalendarInviteFromIcs(icsText: string): MailCalendarInvite | null {
  const methodMatch = icsText.match(/^METHOD:(.+)$/m);
  const method = methodMatch ? methodMatch[1].trim().toUpperCase() : 'REQUEST';

  const events = parseIcsEvents(icsText);
  if (events.length === 0) return null;

  const e = events[0];
  return {
    uid: e.uid,
    title: e.title,
    description: e.description,
    location: e.location,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    allDay: e.allDay,
    organizerEmail: e.organizerEmail,
    attendeeEmails: e.attendeeEmails,
    meetingUrl: e.meetingUrl,
    method,
  };
}

function parseIcsEvents(icsText: string): ParsedCalendarEvent[] {
  const events: ParsedCalendarEvent[] = [];
  const lines = icsText
    .replace(/\r\n[ \t]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  let inEvent = false;
  let current: Record<string, string> = {};
  const attendees: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
      attendees.length = 0;
      continue;
    }
    if (line === 'END:VEVENT') {
      inEvent = false;
      const uid = current['UID'] ?? '';
      const title = current['SUMMARY'] ?? 'Untitled';
      const description = current['DESCRIPTION'] ?? null;
      const location = current['LOCATION'] ?? null;
      const startStr = current['DTSTART'] ?? current['DTSTART;VALUE=DATE'];
      const endStr = current['DTEND'] ?? current['DTEND;VALUE=DATE'];
      const organizer = (current['ORGANIZER'] ?? '').replace(/^mailto:/i, '');
      const urlField = current['URL'] ?? null;

      const startsAt = parseIcsDate(startStr);
      const endsAt = parseIcsDate(endStr);
      if (!startsAt || !endsAt) continue;

      const allDay = Boolean(current['DTSTART;VALUE=DATE']) || (startStr?.length === 8);

      // Extract video meeting URL from description/location/url
      const combinedText = [urlField, description, location].filter(Boolean).join(' ');
      const meetingUrl = extractMeetingUrl(combinedText);

      events.push({
        uid,
        title,
        description: description ? unfoldText(description) : null,
        location,
        startsAt,
        endsAt,
        allDay,
        organizerEmail: organizer || null,
        attendeeEmails: [...attendees],
        meetingUrl,
      });
      continue;
    }

    if (!inEvent) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).toUpperCase();
    const value = line.slice(colonIdx + 1);

    if (key.startsWith('ATTENDEE')) {
      const email = value.replace(/^mailto:/i, '');
      if (email) attendees.push(email);
    } else {
      // Normalize parameterized keys like DTSTART;TZID=...
      const baseKey = key.split(';')[0];
      current[baseKey] = value;
      // Also store with params for VALUE=DATE
      current[key] = value;
    }
  }

  return events;
}

function parseIcsDate(str: string | undefined): Date | null {
  if (!str) return null;
  // Basic date: 20260620 or datetime: 20260620T100000Z
  const cleaned = str.replace(/[TZ]/g, '').replace(/\.\d+$/, '');
  if (cleaned.length === 8) {
    const y = +cleaned.slice(0, 4);
    const m = +cleaned.slice(4, 6) - 1;
    const d = +cleaned.slice(6, 8);
    if (isNaN(y + m + d)) return null;
    return new Date(Date.UTC(y, m, d));
  }
  if (cleaned.length >= 14) {
    const y = +cleaned.slice(0, 4);
    const mo = +cleaned.slice(4, 6) - 1;
    const d = +cleaned.slice(6, 8);
    const h = +cleaned.slice(8, 10);
    const mi = +cleaned.slice(10, 12);
    const s = +cleaned.slice(12, 14);
    if (isNaN(y + mo + d + h + mi + s)) return null;
    return new Date(Date.UTC(y, mo, d, h, mi, s));
  }
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

function unfoldText(text: string): string {
  return text.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
}

function extractMeetingUrl(text: string): string | null {
  const urlPattern = /https?:\/\/(zoom\.us|meet\.google\.com|teams\.microsoft\.com|webex\.com)[^\s"<>]*/i;
  const match = text.match(urlPattern);
  return match ? match[0] : null;
}
