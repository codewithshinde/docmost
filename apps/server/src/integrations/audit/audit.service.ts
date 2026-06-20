import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AuditRepo } from '@docmost/db/repos/audit/audit.repo';
import { InsertableAudit } from '@docmost/db/types/entity.types';
import {
  AuditLogPayload,
  ActorType,
  EXCLUDED_AUDIT_EVENTS,
} from '../../common/events/audit-events';
import {
  AuditContext,
  AUDIT_CONTEXT_KEY,
} from '../../common/middlewares/audit-context.middleware';

export type AuditLogContext = {
  workspaceId: string;
  actorId?: string;
  actorType?: ActorType;
  ipAddress?: string;
  userAgent?: string;
};

export type IAuditService = {
  log(payload: AuditLogPayload): void | Promise<void>;
  logWithContext(
    payload: AuditLogPayload,
    context: AuditLogContext,
  ): void | Promise<void>;
  logBatchWithContext(
    payloads: AuditLogPayload[],
    context: AuditLogContext,
  ): void | Promise<void>;
  setActorId(actorId: string): void;
  setActorType(actorType: ActorType): void;
  updateRetention(
    workspaceId: string,
    retentionDays: number,
  ): void | Promise<void>;
};

export const AUDIT_SERVICE = Symbol('AUDIT_SERVICE');

@Injectable()
export class AuditService implements IAuditService {
  constructor(
    private readonly auditRepo: AuditRepo,
    private readonly cls: ClsService,
  ) {}

  log(payload: AuditLogPayload): void {
    if (EXCLUDED_AUDIT_EVENTS.has(payload.event)) {
      return;
    }

    const context = this.cls.get<AuditContext>(AUDIT_CONTEXT_KEY);
    if (!context?.workspaceId) {
      return;
    }

    void this.write(payload, {
      workspaceId: context.workspaceId,
      actorId: context.actorId ?? undefined,
      actorType: (context.actorType as ActorType) ?? 'user',
      ipAddress: context.ipAddress ?? undefined,
      userAgent: context.userAgent ?? undefined,
    });
  }

  logWithContext(payload: AuditLogPayload, context: AuditLogContext): void {
    if (EXCLUDED_AUDIT_EVENTS.has(payload.event)) {
      return;
    }

    void this.write(payload, context);
  }

  logBatchWithContext(
    payloads: AuditLogPayload[],
    context: AuditLogContext,
  ): void {
    const filtered = payloads.filter(
      (payload) => !EXCLUDED_AUDIT_EVENTS.has(payload.event),
    );

    if (filtered.length === 0) {
      return;
    }

    void this.auditRepo
      .insertAuditLogs(
        filtered.map((payload) => this.toInsertable(payload, context)),
      )
      .catch(() => {
        // best-effort, ignore failures
      });
  }

  setActorId(actorId: string): void {
    const context = this.cls.get<AuditContext>(AUDIT_CONTEXT_KEY);
    if (context) {
      context.actorId = actorId;
      this.cls.set(AUDIT_CONTEXT_KEY, context);
    }
  }

  setActorType(actorType: ActorType): void {
    const context = this.cls.get<AuditContext>(AUDIT_CONTEXT_KEY);
    if (context) {
      context.actorType = actorType;
      this.cls.set(AUDIT_CONTEXT_KEY, context);
    }
  }

  async updateRetention(
    workspaceId: string,
    retentionDays: number,
  ): Promise<void> {
    if (!retentionDays || retentionDays <= 0) {
      return;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    await this.auditRepo.deleteOlderThan(workspaceId, cutoff);
  }

  private async write(
    payload: AuditLogPayload,
    context: AuditLogContext,
  ): Promise<void> {
    try {
      await this.auditRepo.insertAuditLog(this.toInsertable(payload, context));
    } catch {
      // best-effort, ignore failures
    }
  }

  private toInsertable(
    payload: AuditLogPayload,
    context: AuditLogContext,
  ): InsertableAudit {
    return {
      workspaceId: context.workspaceId,
      actorId: context.actorId ?? null,
      actorType: context.actorType ?? 'user',
      event: payload.event,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId ?? null,
      spaceId: payload.spaceId ?? null,
      changes: payload.changes ?? null,
      metadata: payload.metadata ?? null,
      ipAddress: context.ipAddress ?? null,
    };
  }
}
