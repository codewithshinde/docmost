import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { EnvironmentService } from '../environment/environment.service';
import { PushSubscriptionRepo } from '@docmost/db/repos/notification/push-subscription.repo';

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);
  private enabled = false;

  constructor(
    private readonly environmentService: EnvironmentService,
    private readonly pushSubscriptionRepo: PushSubscriptionRepo,
  ) {}

  onModuleInit(): void {
    const publicKey = this.environmentService.getVapidPublicKey();
    const privateKey = this.environmentService.getVapidPrivateKey();

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'VAPID keys are not configured - web push notifications are disabled',
      );
      return;
    }

    webpush.setVapidDetails(
      this.environmentService.getVapidSubject(),
      publicKey,
      privateKey,
    );
    this.enabled = true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getPublicKey(): string | undefined {
    return this.environmentService.getVapidPublicKey();
  }

  async sendToUser(
    userId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.enabled) return;

    const subscriptions =
      await this.pushSubscriptionRepo.getSubscriptionsForUser(userId);
    if (subscriptions.length === 0) return;

    const body = JSON.stringify(payload);

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            body,
          );
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await this.pushSubscriptionRepo.deleteByEndpoint(
              subscription.endpoint,
            );
          } else {
            this.logger.error(
              `Failed to send push notification: ${err?.message ?? err}`,
            );
          }
        }
      }),
    );
  }
}
