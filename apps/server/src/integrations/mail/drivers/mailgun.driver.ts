import { Logger } from '@nestjs/common';
import { MailMessage } from '../interfaces/mail.message';
import { MailgunConfig } from '../interfaces';
import { mailLogName } from '../mail.utils';
import { MailDriver } from './interfaces/mail-driver.interface';

export class MailgunDriver implements MailDriver {
  private readonly logger = new Logger(mailLogName(MailgunDriver.name));

  constructor(private readonly config: MailgunConfig) {}

  async sendMail(message: MailMessage): Promise<void> {
    const form = new URLSearchParams();
    form.set('from', message.from);
    form.set('to', message.to);
    form.set('subject', message.subject);
    if (message.text) form.set('text', message.text);
    if (message.html) form.set('html', message.html);

    const baseUrl = this.config.apiBaseUrl || 'https://api.mailgun.net';
    const res = await fetch(
      `${baseUrl.replace(/\/$/, '')}/v3/${this.config.domain}/messages`,
      {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(
            `api:${this.config.apiKey}`,
          ).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: form,
      },
    );

    if (!res.ok) {
      const body = await res.text();
      this.logger.warn(`Failed to send mail to ${message.to}: ${body}`);
      throw new Error(`Mailgun send failed: ${res.status}`);
    }
    this.logger.debug(`Sent mail to ${message.to}`);
  }
}
