import { Logger } from '@nestjs/common';
import { MailMessage } from '../interfaces/mail.message';
import { SendGridConfig } from '../interfaces';
import { mailLogName } from '../mail.utils';
import { MailDriver } from './interfaces/mail-driver.interface';

export class SendGridDriver implements MailDriver {
  private readonly logger = new Logger(mailLogName(SendGridDriver.name));

  constructor(private readonly config: SendGridConfig) {}

  async sendMail(message: MailMessage): Promise<void> {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: {
          email: this.extractEmail(message.from),
          name: this.extractName(message.from),
        },
        subject: message.subject,
        content: [
          ...(message.text
            ? [{ type: 'text/plain', value: message.text }]
            : []),
          ...(message.html ? [{ type: 'text/html', value: message.html }] : []),
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.warn(`Failed to send mail to ${message.to}: ${body}`);
      throw new Error(`SendGrid send failed: ${res.status}`);
    }
    this.logger.debug(`Sent mail to ${message.to}`);
  }

  private extractEmail(from: string): string {
    const match = from?.match(/<([^>]+)>/);
    return (match?.[1] ?? from ?? '').trim();
  }

  private extractName(from: string): string | undefined {
    const match = from?.match(/^(.*?)\s*</);
    return match?.[1]?.trim() || undefined;
  }
}
