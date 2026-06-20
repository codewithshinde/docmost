import { Inject, Injectable } from '@nestjs/common';
import { MAIL_DRIVER_TOKEN } from './mail.constants';
import { MailDriver } from './drivers/interfaces/mail-driver.interface';
import { MailMessage } from './interfaces/mail.message';
import { EnvironmentService } from '../environment/environment.service';
import { InjectQueue } from '@nestjs/bullmq';
import { QueueName, QueueJob } from '../queue/constants';
import { Queue } from 'bullmq';
import { render } from 'react-email';
import { IntegrationSettingsService } from '../integration/integration-settings.service';
import { MailConfig, MailOption } from './interfaces';
import { createMailDriver } from './providers/mail.provider';

@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_DRIVER_TOKEN) private mailDriver: MailDriver,
    private readonly environmentService: EnvironmentService,
    private readonly integrationSettingsService: IntegrationSettingsService,
    @InjectQueue(QueueName.EMAIL_QUEUE) private emailQueue: Queue,
  ) {}

  async sendEmail(message: MailMessage): Promise<void> {
    if (this.isRecipientBlocked(message.to)) {
      return;
    }

    if (message.template) {
      // in case this method is used directly. we do not send the tsx template from queue
      message.html = await render(message.template, {
        pretty: true,
      });
      message.text = await render(message.template, { plainText: true });
    }

    const { driver, sender } = await this.resolveDriverAndSender(message);
    await driver.sendMail({ from: sender, ...message });
  }

  async sendToQueue(message: MailMessage): Promise<void> {
    if (this.isRecipientBlocked(message.to)) {
      return;
    }

    if (message.template) {
      // transform the React object because it gets lost when sent via the queue
      message.html = await render(message.template, {
        pretty: true,
      });
      message.text = await render(message.template, {
        plainText: true,
      });
      delete message.template;
    }
    await this.emailQueue.add(QueueJob.SEND_EMAIL, message);
  }

  private isRecipientBlocked(to: string): boolean {
    const blocked = this.environmentService.getMailBlockedRecipientDomains();
    if (blocked.length === 0) return false;
    const domain = to?.split('@')[1]?.toLowerCase();
    return !!domain && blocked.includes(domain);
  }

  private async resolveDriverAndSender(
    message: MailMessage,
  ): Promise<{ driver: MailDriver; sender: string }> {
    const runtime = await this.integrationSettingsService.getMailRuntimeConfig(
      message.workspaceId,
    );

    const fromAddress =
      message.from || runtime.fromAddress || this.environmentService.getMailFromAddress();
    const fromName =
      message.fromName || runtime.fromName || this.environmentService.getMailFromName();
    const sender = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

    if (!message.workspaceId || !runtime.enabled || !runtime.configured) {
      return { driver: this.mailDriver, sender };
    }

    const config = this.toMailConfig(runtime);
    if (!config) {
      return { driver: this.mailDriver, sender };
    }

    return { driver: createMailDriver(config), sender };
  }

  private toMailConfig(runtime: Awaited<ReturnType<IntegrationSettingsService['getMailRuntimeConfig']>>): MailConfig | null {
    switch (runtime.provider) {
      case MailOption.SMTP:
        return {
          driver: MailOption.SMTP,
          config: {
            host: runtime.smtpHost,
            port: runtime.smtpPort,
            secure: runtime.smtpSecure,
            ignoreTLS: runtime.smtpIgnoreTls,
            connectionTimeout: 30 * 1000,
            auth:
              runtime.smtpUsername && runtime.smtpPassword
                ? {
                    user: runtime.smtpUsername,
                    pass: runtime.smtpPassword,
                  }
                : undefined,
          },
        };
      case MailOption.Postmark:
        return {
          driver: MailOption.Postmark,
          config: { postmarkToken: runtime.postmarkToken },
        };
      case MailOption.SendGrid:
        return {
          driver: MailOption.SendGrid,
          config: { apiKey: runtime.sendgridApiKey },
        };
      case MailOption.Mailgun:
        return {
          driver: MailOption.Mailgun,
          config: {
            apiKey: runtime.mailgunApiKey,
            domain: runtime.mailgunDomain,
            apiBaseUrl: runtime.mailgunApiBaseUrl,
          },
        };
      case MailOption.SES:
        return {
          driver: MailOption.SES,
          config: {
            accessKeyId: runtime.sesAccessKeyId,
            secretAccessKey: runtime.sesSecretAccessKey,
            region: runtime.sesRegion,
          },
        };
      case MailOption.Log:
        return { driver: MailOption.Log, config: {} };
      default:
        return null;
    }
  }
}
