import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { NotificationModule } from '../notification/notification.module';
import { MailAccountModule } from '../mail-account/mail-account.module';

@Module({
  imports: [NotificationModule, MailAccountModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
