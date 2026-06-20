import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { NotificationModule } from '../../notification/notification.module';
import { WebhookModule } from '../../../integrations/webhook/webhook.module';

@Module({
  imports: [NotificationModule, WebhookModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
