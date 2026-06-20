import { Module } from '@nestjs/common';
import { MailAccountController } from './mail-account.controller';
import { MailAccountService } from './mail-account.service';

@Module({
  controllers: [MailAccountController],
  providers: [MailAccountService],
  exports: [MailAccountService],
})
export class MailAccountModule {}
