import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { PushController } from './push.controller';
import { NotificationProcessor } from './notification.processor';
import { CommentNotificationService } from './services/comment.notification';
import { PageNotificationService } from './services/page.notification';
import { VerificationNotificationService } from './services/verification.notification';
import { ChatNotificationService } from './services/chat.notification';
import { CalendarNotificationService } from './services/calendar.notification';
import { PageUpdateEmailRateLimiter } from './services/page-update-email-rate-limiter';
import { WebPushService } from '../../integrations/webpush/webpush.service';

@Module({
  imports: [],
  controllers: [NotificationController, PushController],
  providers: [
    NotificationService,
    NotificationProcessor,
    CommentNotificationService,
    PageNotificationService,
    VerificationNotificationService,
    ChatNotificationService,
    CalendarNotificationService,
    PageUpdateEmailRateLimiter,
    WebPushService,
  ],
  exports: [
    NotificationService,
    ChatNotificationService,
    CalendarNotificationService,
    WebPushService,
  ],
})
export class NotificationModule {}
