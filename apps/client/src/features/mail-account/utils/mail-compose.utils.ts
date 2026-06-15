import DOMPurify from "dompurify";
import type { Locale } from "date-fns";
import { formatLocalized } from "@/lib/date-locale";
import { IMailMessageDetail } from "../types/mail-account.types";
import { ComposeMailInitialValues } from "../components/compose-mail-modal";

export function extractEmailAddress(value: string): string {
  const match = value.match(/<([^<>]+)>/);
  return (match ? match[1] : value).trim();
}

function getPlainTextBody(message: IMailMessageDetail): string {
  if (message.text) return message.text;
  if (!message.html) return "";

  const sanitized = DOMPurify.sanitize(message.html);
  const doc = new DOMParser().parseFromString(sanitized, "text/html");
  return doc.body.textContent?.trim() ?? "";
}

function quoteBody(body: string): string {
  return body
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

export function buildReplyInitialValues(
  message: IMailMessageDetail,
  locale?: Locale,
): ComposeMailInitialValues {
  const subject = message.subject.toLowerCase().startsWith("re:")
    ? message.subject
    : `Re: ${message.subject}`;

  const dateLine = message.date
    ? `On ${formatLocalized(message.date, "PPpp", "PPpp", locale)}, ${message.from} wrote:`
    : `${message.from} wrote:`;

  const body = `\n\n${dateLine}\n${quoteBody(getPlainTextBody(message))}`;

  return {
    to: extractEmailAddress(message.from),
    subject,
    body,
    inReplyTo: message.messageId ?? undefined,
    references: message.messageId ? [message.messageId] : undefined,
  };
}

export function buildForwardInitialValues(
  message: IMailMessageDetail,
): ComposeMailInitialValues {
  const subject = message.subject.toLowerCase().startsWith("fwd:")
    ? message.subject
    : `Fwd: ${message.subject}`;

  const body = `\n\n---------- Forwarded message ----------\nFrom: ${message.from}\nDate: ${message.date ?? ""}\nSubject: ${message.subject}\nTo: ${message.to}\n\n${getPlainTextBody(message)}`;

  return {
    subject,
    body,
  };
}
