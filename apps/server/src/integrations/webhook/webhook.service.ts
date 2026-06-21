import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomBytes } from 'node:crypto';
import { WebhookRepo } from '@likh/db/repos/webhook/webhook.repo';
import { WebhookDeliveryRepo } from '@likh/db/repos/webhook/webhook-delivery.repo';
import { EncryptionService } from '../crypto/encryption.service';
import { QueueJob, QueueName } from '../queue/constants';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';

export const WebhookEvents = {
  CHAT_MESSAGE_CREATED: 'chat.message.created',
  PAGE_CREATED: 'page.created',
  COMMENT_CREATED: 'comment.created',
} as const;

@Injectable()
export class WebhookService {
  constructor(
    private readonly webhookRepo: WebhookRepo,
    private readonly deliveryRepo: WebhookDeliveryRepo,
    private readonly encryptionService: EncryptionService,
    @InjectQueue(QueueName.GENERAL_QUEUE) private readonly queue: Queue,
  ) {}

  list(workspaceId: string) {
    return this.webhookRepo.findAll(workspaceId).then((rows) =>
      rows.map((row) => ({
        ...row,
        secret: undefined,
      })),
    );
  }

  async create(dto: CreateWebhookDto, workspaceId: string, userId: string) {
    this.validateUrl(dto.url);
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    const row = await this.webhookRepo.insert({
      workspaceId,
      name: dto.name,
      url: dto.url,
      events: dto.events,
      secret: this.encryptionService.encrypt(secret),
      createdById: userId,
    });
    return { ...row, secret };
  }

  async update(dto: UpdateWebhookDto, workspaceId: string) {
    if (dto.url) this.validateUrl(dto.url);
    const { webhookId, ...rest } = dto;
    const row = await this.webhookRepo.update(webhookId, workspaceId, rest);
    if (!row) throw new BadRequestException('Webhook not found');
    return { ...row, secret: undefined };
  }

  async delete(webhookId: string, workspaceId: string) {
    await this.webhookRepo.delete(webhookId, workspaceId);
    return { success: true };
  }

  async deliveries(webhookId: string, workspaceId: string) {
    return this.deliveryRepo.findRecent(webhookId, workspaceId);
  }

  async enqueue(workspaceId: string, event: string, payload: Record<string, any>) {
    const webhooks = await this.webhookRepo.findEnabledForEvent(workspaceId, event);
    await Promise.all(
      webhooks.map(async (webhook) => {
        const delivery = await this.deliveryRepo.insert({
          workspaceId,
          webhookId: webhook.id,
          event,
          payload,
        });
        await this.queue.add(QueueJob.WEBHOOK_DELIVERY, {
          deliveryId: delivery.id,
        });
      }),
    );
  }

  private validateUrl(value: string) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('Invalid webhook URL');
    }
    if (!['https:', 'http:'].includes(url.protocol)) {
      throw new BadRequestException('Webhook URL must use http or https');
    }
    if (
      ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(
        url.hostname.toLowerCase(),
      ) ||
      url.hostname.startsWith('10.') ||
      url.hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname)
    ) {
      throw new BadRequestException('Webhook URL cannot target a private host');
    }
  }
}
