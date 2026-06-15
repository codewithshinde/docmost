import { Logger, OnModuleDestroy } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueueJob, QueueName } from '../constants';
import {
  IAddPageWatchersJob,
  IPageBacklinkJob,
  IWebhookDeliveryJob,
} from '../constants/queue.interface';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { BacklinkRepo } from '@docmost/db/repos/backlink/backlink.repo';
import {
  WatcherRepo,
  WatcherType,
} from '@docmost/db/repos/watcher/watcher.repo';
import { InsertableWatcher } from '@docmost/db/types/entity.types';
import { processBacklinks } from '../tasks/backlinks.task';
import { WebhookRepo } from '@docmost/db/repos/webhook/webhook.repo';
import { WebhookDeliveryRepo } from '@docmost/db/repos/webhook/webhook-delivery.repo';
import { EncryptionService } from '../../crypto/encryption.service';
import { createHmac } from 'node:crypto';

@Processor(QueueName.GENERAL_QUEUE)
export class GeneralQueueProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  private readonly logger = new Logger(GeneralQueueProcessor.name);
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly backlinkRepo: BacklinkRepo,
    private readonly watcherRepo: WatcherRepo,
    private readonly webhookRepo: WebhookRepo,
    private readonly webhookDeliveryRepo: WebhookDeliveryRepo,
    private readonly encryptionService: EncryptionService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      switch (job.name) {
        case QueueJob.ADD_PAGE_WATCHERS: {
          const { userIds, pageId, spaceId, workspaceId } =
            job.data as IAddPageWatchersJob;
          const watchers: InsertableWatcher[] = userIds.map((userId) => ({
            userId,
            pageId,
            spaceId,
            workspaceId,
            type: WatcherType.PAGE,
            addedById: userId,
          }));
          await this.watcherRepo.insertMany(watchers);
          break;
        }

        case QueueJob.PAGE_BACKLINKS: {
          await processBacklinks(
            this.db,
            this.backlinkRepo,
            job.data as IPageBacklinkJob,
          );
          break;
        }

        case QueueJob.WEBHOOK_DELIVERY: {
          await this.deliverWebhook(job.data as IWebhookDeliveryJob);
          break;
        }
      }
    } catch (err) {
      throw err;
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Processing ${job.name} job`);
  }

  @OnWorkerEvent('failed')
  onError(job: Job) {
    this.logger.error(
      `Error processing ${job.name} job. Reason: ${job.failedReason}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Completed ${job.name} job`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async deliverWebhook(job: IWebhookDeliveryJob): Promise<void> {
    const delivery = await this.webhookDeliveryRepo.findById(job.deliveryId);
    if (!delivery) return;
    const webhook = await this.webhookRepo.findById(
      delivery.webhookId,
      delivery.workspaceId,
    );
    if (!webhook || !webhook.enabled) return;

    const body = JSON.stringify({
      id: delivery.id,
      event: delivery.event,
      createdAt: delivery.createdAt,
      data: delivery.payload,
    });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const secret = this.encryptionService.decrypt(webhook.secret);
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Docmost-Webhooks/1.0',
          'x-docmost-event': delivery.event,
          'x-docmost-delivery': delivery.id,
          'x-docmost-timestamp': timestamp,
          'x-docmost-signature': `sha256=${signature}`,
        },
        body,
      });
      const responseBody = await res.text();
      if (!res.ok) {
        await this.webhookDeliveryRepo.markFailed(
          delivery.id,
          responseBody || res.statusText,
          res.status,
        );
        throw new Error(`Webhook delivery failed with ${res.status}`);
      }
      await this.webhookDeliveryRepo.markDelivered(
        delivery.id,
        res.status,
        responseBody,
      );
    } catch (err) {
      await this.webhookDeliveryRepo.markFailed(
        delivery.id,
        err instanceof Error ? err.message : 'Unknown webhook delivery error',
      );
      throw err;
    }
  }
}
