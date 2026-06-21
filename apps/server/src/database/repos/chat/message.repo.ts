import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@likh/db/types/kysely.types';
import { dbOrTx } from '@likh/db/utils';
import {
  InsertableMessage,
  Message,
  UpdatableMessage,
} from '@likh/db/types/entity.types';
import { ExpressionBuilder } from 'kysely';
import { DB } from '@likh/db/types/db';
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres';
import { executeWithCursorPagination } from '@likh/db/pagination/cursor-pagination';
import { PaginationOptions } from '@likh/db/pagination/pagination-options';

@Injectable()
export class MessageRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertMessage(
    insertableMessage: InsertableMessage,
    trx?: KyselyTransaction,
  ): Promise<Message> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('messages')
      .values(insertableMessage)
      .returningAll()
      .executeTakeFirst();
  }

  async findById(
    messageId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<Message> {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('messages')
      .selectAll()
      .where('id', '=', messageId)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async getMessageWithRelations(messageId: string, workspaceId: string) {
    return this.db
      .selectFrom('messages')
      .selectAll('messages')
      .select((eb) => this.withSender(eb))
      .select((eb) => this.withReactions(eb))
      .select((eb) => this.withAttachments(eb))
      .select((eb) => this.withReplyCount(eb))
      .where('messages.id', '=', messageId)
      .where('messages.workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async updateMessage(
    updatableMessage: UpdatableMessage,
    messageId: string,
    workspaceId: string,
  ): Promise<Message> {
    return this.db
      .updateTable('messages')
      .set({ ...updatableMessage, updatedAt: new Date() })
      .where('id', '=', messageId)
      .where('workspaceId', '=', workspaceId)
      .returningAll()
      .executeTakeFirst();
  }

  async softDeleteMessage(
    messageId: string,
    workspaceId: string,
  ): Promise<void> {
    await this.db
      .updateTable('messages')
      .set({ deletedAt: new Date(), content: null })
      .where('id', '=', messageId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async getChannelMessages(channelId: string, pagination: PaginationOptions) {
    const query = this.db
      .selectFrom('messages')
      .selectAll('messages')
      .select((eb) => this.withSender(eb))
      .select((eb) => this.withReactions(eb))
      .select((eb) => this.withAttachments(eb))
      .select((eb) => this.withReplyCount(eb))
      .where('messages.channelId', '=', channelId)
      .where('messages.rootId', 'is', null)
      .where('messages.deletedAt', 'is', null);

    return executeWithCursorPagination(query, {
      perPage: pagination.limit,
      cursor: pagination.cursor,
      beforeCursor: pagination.beforeCursor,
      fields: [{ expression: 'messages.id', direction: 'desc' }],
      parseCursor: (cursor) => ({ id: cursor.id }),
    });
  }

  async getThreadMessages(rootId: string, pagination: PaginationOptions) {
    const query = this.db
      .selectFrom('messages')
      .selectAll('messages')
      .select((eb) => this.withSender(eb))
      .select((eb) => this.withReactions(eb))
      .select((eb) => this.withAttachments(eb))
      .where('messages.rootId', '=', rootId)
      .where('messages.deletedAt', 'is', null);

    return executeWithCursorPagination(query, {
      perPage: pagination.limit,
      cursor: pagination.cursor,
      beforeCursor: pagination.beforeCursor,
      fields: [{ expression: 'messages.id', direction: 'asc' }],
      parseCursor: (cursor) => ({ id: cursor.id }),
    });
  }

  async getReplyCounts(messageIds: string[]): Promise<Record<string, number>> {
    if (messageIds.length === 0) {
      return {};
    }

    const rows = await this.db
      .selectFrom('messages')
      .select(['rootId', (eb) => eb.fn.countAll().as('count')])
      .where('rootId', 'in', messageIds)
      .where('deletedAt', 'is', null)
      .groupBy('rootId')
      .execute();

    return rows.reduce<Record<string, number>>((acc, row) => {
      if (row.rootId) {
        acc[row.rootId] = Number(row.count);
      }
      return acc;
    }, {});
  }

  withSender(eb: ExpressionBuilder<DB, 'messages'>) {
    return jsonObjectFrom(
      eb
        .selectFrom('users')
        .select(['users.id', 'users.name', 'users.email', 'users.avatarUrl'])
        .whereRef('users.id', '=', 'messages.userId'),
    ).as('user');
  }

  withReactions(eb: ExpressionBuilder<DB, 'messages'>) {
    return jsonArrayFrom(
      eb
        .selectFrom('messageReactions')
        .select(['messageReactions.emoji', 'messageReactions.userId'])
        .whereRef('messageReactions.messageId', '=', 'messages.id'),
    ).as('reactions');
  }

  withAttachments(eb: ExpressionBuilder<DB, 'messages'>) {
    return jsonArrayFrom(
      eb
        .selectFrom('messageAttachments')
        .innerJoin(
          'attachments',
          'attachments.id',
          'messageAttachments.attachmentId',
        )
        .select([
          'attachments.id',
          'attachments.fileName',
          'attachments.fileSize',
          'attachments.mimeType',
          'attachments.type',
        ])
        .whereRef('messageAttachments.messageId', '=', 'messages.id'),
    ).as('attachments');
  }

  withReplyCount(eb: ExpressionBuilder<DB, 'messages'>) {
    return eb
      .selectFrom('messages as replies')
      .select((eb) => eb.fn.countAll().as('count'))
      .whereRef('replies.rootId', '=', 'messages.id')
      .where('replies.deletedAt', 'is', null)
      .as('replyCount');
  }
}
