import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditRetentionCleanupService } from './services/audit-retention-cleanup.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRetentionCleanupService],
  exports: [AuditService],
})
export class AuditCoreModule {}
