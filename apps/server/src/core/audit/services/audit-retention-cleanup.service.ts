import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { AuditRepo } from '@docmost/db/repos/audit/audit.repo';
import { DEFAULT_AUDIT_RETENTION_DAYS } from '../audit.service';

@Injectable()
export class AuditRetentionCleanupService {
  private readonly logger = new Logger(AuditRetentionCleanupService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly auditRepo: AuditRepo,
  ) {}

  @Interval('audit-retention-cleanup', 24 * 60 * 60 * 1000) // every 24 hours
  async cleanupOldAuditLogs() {
    try {
      this.logger.debug('Starting audit retention cleanup job');

      const workspaces = await this.db
        .selectFrom('workspaces')
        .select(['id', 'auditRetentionDays'])
        .where('deletedAt', 'is', null)
        .execute();

      for (const workspace of workspaces) {
        const retentionDays =
          workspace.auditRetentionDays ?? DEFAULT_AUDIT_RETENTION_DAYS;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        await this.auditRepo.deleteOlderThan(workspace.id, cutoffDate);
      }

      this.logger.debug('Audit retention cleanup job completed');
    } catch (error) {
      this.logger.error(
        'Audit retention cleanup job failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
