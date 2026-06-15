import { Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { MailMessage } from '../interfaces/mail.message';
import { SesConfig } from '../interfaces';
import { mailLogName } from '../mail.utils';
import { MailDriver } from './interfaces/mail-driver.interface';

export class SesDriver implements MailDriver {
  private readonly logger = new Logger(mailLogName(SesDriver.name));
  private readonly client: SESClient;

  constructor(config: SesConfig) {
    this.client = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async sendMail(message: MailMessage): Promise<void> {
    try {
      await this.client.send(
        new SendEmailCommand({
          Source: message.from,
          Destination: { ToAddresses: [message.to] },
          Message: {
            Subject: { Data: message.subject },
            Body: {
              ...(message.text ? { Text: { Data: message.text } } : {}),
              ...(message.html ? { Html: { Data: message.html } } : {}),
            },
          },
        }),
      );
      this.logger.debug(`Sent mail to ${message.to}`);
    } catch (err) {
      this.logger.warn(`Failed to send mail to ${message.to}: ${err}`);
      throw err;
    }
  }
}
