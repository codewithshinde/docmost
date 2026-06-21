import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@likh/db/types/kysely.types';
import { dbOrTx } from '@likh/db/utils';
import { Audit, InsertableAudit } from '@likh/db/types/entity.types';
import { PaginationOptions } from '@likh/db/pagination/pagination-options';
import { executeWithCursorPagination } from '@likh/db/pagination/cursor-pagination';
import { ExpressionBuilder } from 'kysely';
import { DB } from '@likh/db/types/db';
import { jsonObjectFrom } from 'kysely/helpers/postgres';
import { AuditResource } from '../../../common/events/audit-events';

export type AuditLogFilter = {
  event?: string;
  resourceType?: string;
  actorId?: string;
  spaceId?: string;
  startDate?: string;
  endDate?: string;
};

type AuditResourceInfo = {
  id: string;
  name: string;
  slug?: string;
  slugId?: string;
};

@Injectable()
export class AuditRepo {
  private baseFields: Array<keyof Audit> = [
    'id',
    'workspaceId',
    'actorId',
    'actorType',
    'event',
    'resourceType',
    'resourceId',
    'spaceId',
    'changes',
    'metadata',
    'ipAddress',
    'createdAt',
  ];

  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertAuditLog(
    insertableAudit: InsertableAudit,
    trx?: KyselyTransaction,
  ): Promise<Audit> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('audit')
      .values(insertableAudit)
      .returning(this.baseFields)
      .executeTakeFirst();
  }

  async insertAuditLogs(
    insertableAudits: InsertableAudit[],
    trx?: KyselyTransaction,
  ): Promise<void> {
    if (insertableAudits.length === 0) {
      return;
    }
    const db = dbOrTx(this.db, trx);
    await db.insertInto('audit').values(insertableAudits).execute();
  }

  async findAuditLogs(
    workspaceId: string,
    pagination: PaginationOptions,
    filters?: AuditLogFilter,
  ) {
    let query = this.db
      .selectFrom('audit')
      .select(this.baseFields)
      .select((eb) => this.withActor(eb))
      .where('workspaceId', '=', workspaceId);

    if (filters?.event) {
      query = query.where('event', '=', filters.event);
    }

    if (filters?.resourceType) {
      query = query.where('resourceType', '=', filters.resourceType);
    }

    if (filters?.actorId) {
      query = query.where('actorId', '=', filters.actorId);
    }

    if (filters?.spaceId) {
      query = query.where('spaceId', '=', filters.spaceId);
    }

    if (filters?.startDate) {
      query = query.where('createdAt', '>=', new Date(filters.startDate));
    }

    if (filters?.endDate) {
      query = query.where('createdAt', '<=', new Date(filters.endDate));
    }

    const result = await executeWithCursorPagination(query, {
      perPage: pagination.limit,
      cursor: pagination.cursor,
      beforeCursor: pagination.beforeCursor,
      fields: [
        { expression: 'createdAt', direction: 'desc' },
        { expression: 'id', direction: 'desc' },
      ],
      parseCursor: (cursor) => ({
        createdAt: new Date(cursor.createdAt),
        id: cursor.id,
      }),
    });

    return {
      ...result,
      items: await this.enrichResources(result.items),
    };
  }

  async deleteOlderThan(workspaceId: string, cutoffDate: Date): Promise<void> {
    await this.db
      .deleteFrom('audit')
      .where('workspaceId', '=', workspaceId)
      .where('createdAt', '<', cutoffDate)
      .execute();
  }

  withActor(eb: ExpressionBuilder<DB, 'audit'>) {
    return jsonObjectFrom(
      eb
        .selectFrom('users')
        .select(['users.id', 'users.name', 'users.email', 'users.avatarUrl'])
        .whereRef('users.id', '=', 'audit.actorId'),
    ).as('actor');
  }

  private async enrichResources<T extends { resourceType: string; resourceId: string | null }>(
    items: T[],
  ): Promise<(T & { resource?: AuditResourceInfo })[]> {
    const idsByType = new Map<string, Set<string>>();

    for (const item of items) {
      if (!item.resourceId) {
        continue;
      }
      if (!idsByType.has(item.resourceType)) {
        idsByType.set(item.resourceType, new Set());
      }
      idsByType.get(item.resourceType).add(item.resourceId);
    }

    const resourceMaps = new Map<string, Map<string, AuditResourceInfo>>();

    for (const [resourceType, idsSet] of idsByType) {
      const map = await this.fetchResourceMap(resourceType, Array.from(idsSet));
      if (map) {
        resourceMaps.set(resourceType, map);
      }
    }

    return items.map((item) => {
      if (!item.resourceId) {
        return item;
      }
      const resource = resourceMaps.get(item.resourceType)?.get(item.resourceId);
      return resource ? { ...item, resource } : item;
    });
  }

  private async fetchResourceMap(
    resourceType: string,
    ids: string[],
  ): Promise<Map<string, AuditResourceInfo> | null> {
    switch (resourceType) {
      case AuditResource.PAGE: {
        const rows = await this.db
          .selectFrom('pages')
          .select(['id', 'title', 'slugId'])
          .where('id', 'in', ids)
          .execute();
        return new Map(
          rows.map((row) => [
            row.id,
            { id: row.id, name: row.title ?? 'Untitled', slugId: row.slugId },
          ]),
        );
      }

      case AuditResource.SPACE: {
        const rows = await this.db
          .selectFrom('spaces')
          .select(['id', 'name', 'slug'])
          .where('id', 'in', ids)
          .execute();
        return new Map(
          rows.map((row) => [
            row.id,
            { id: row.id, name: row.name ?? row.slug, slug: row.slug },
          ]),
        );
      }

      case AuditResource.GROUP: {
        const rows = await this.db
          .selectFrom('groups')
          .select(['id', 'name'])
          .where('id', 'in', ids)
          .execute();
        return new Map(rows.map((row) => [row.id, { id: row.id, name: row.name }]));
      }

      case AuditResource.USER: {
        const rows = await this.db
          .selectFrom('users')
          .select(['id', 'name', 'email'])
          .where('id', 'in', ids)
          .execute();
        return new Map(
          rows.map((row) => [row.id, { id: row.id, name: row.name ?? row.email }]),
        );
      }

      case AuditResource.API_KEY: {
        const rows = await this.db
          .selectFrom('apiKeys')
          .select(['id', 'name'])
          .where('id', 'in', ids)
          .execute();
        return new Map(rows.map((row) => [row.id, { id: row.id, name: row.name }]));
      }

      case AuditResource.SCIM_TOKEN: {
        const rows = await this.db
          .selectFrom('scimTokens')
          .select(['id', 'name'])
          .where('id', 'in', ids)
          .execute();
        return new Map(rows.map((row) => [row.id, { id: row.id, name: row.name }]));
      }

      case AuditResource.SSO_PROVIDER: {
        const rows = await this.db
          .selectFrom('authProviders')
          .select(['id', 'name'])
          .where('id', 'in', ids)
          .execute();
        return new Map(rows.map((row) => [row.id, { id: row.id, name: row.name }]));
      }

      case AuditResource.WORKSPACE: {
        const rows = await this.db
          .selectFrom('workspaces')
          .select(['id', 'name'])
          .where('id', 'in', ids)
          .execute();
        return new Map(rows.map((row) => [row.id, { id: row.id, name: row.name }]));
      }

      case AuditResource.ATTACHMENT: {
        const rows = await this.db
          .selectFrom('attachments')
          .select(['id', 'fileName'])
          .where('id', 'in', ids)
          .execute();
        return new Map(
          rows.map((row) => [row.id, { id: row.id, name: row.fileName }]),
        );
      }

      case AuditResource.TEMPLATE: {
        const rows = await this.db
          .selectFrom('templates')
          .select(['id', 'title'])
          .where('id', 'in', ids)
          .execute();
        return new Map(
          rows.map((row) => [row.id, { id: row.id, name: row.title ?? 'Untitled' }]),
        );
      }

      default:
        return null;
    }
  }
}
