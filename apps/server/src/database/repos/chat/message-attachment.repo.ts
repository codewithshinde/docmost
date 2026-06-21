import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@likh/db/types/kysely.types';
import { dbOrTx } from '@likh/db/utils';

@Injectable()
export class MessageAttachmentRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async insertMessageAttachments(
    messageId: string,
    attachmentIds: string[],
    trx?: KyselyTransaction,
  ): Promise<void> {
    if (attachmentIds.length === 0) {
      return;
    }

    const db = dbOrTx(this.db, trx);
    await db
      .insertInto('messageAttachments')
      .values(attachmentIds.map((attachmentId) => ({ messageId, attachmentId })))
      .execute();
  }

  async findByAttachmentId(
    attachmentId: string,
  ): Promise<{ messageId: string; channelId: string } | undefined> {
    return this.db
      .selectFrom('messageAttachments')
      .innerJoin('messages', 'messages.id', 'messageAttachments.messageId')
      .select(['messageAttachments.messageId', 'messages.channelId'])
      .where('messageAttachments.attachmentId', '=', attachmentId)
      .executeTakeFirst();
  }

  async getAttachmentsForMessages(messageIds: string[]) {
    if (messageIds.length === 0) {
      return {};
    }

    const rows = await this.db
      .selectFrom('messageAttachments')
      .innerJoin(
        'attachments',
        'attachments.id',
        'messageAttachments.attachmentId',
      )
      .select([
        'messageAttachments.messageId',
        'attachments.id',
        'attachments.fileName',
        'attachments.fileSize',
        'attachments.mimeType',
        'attachments.type',
      ])
      .where('messageAttachments.messageId', 'in', messageIds)
      .execute();

    return rows.reduce<Record<string, any[]>>((acc, row) => {
      const { messageId, ...attachment } = row;
      (acc[messageId] ??= []).push(attachment);
      return acc;
    }, {});
  }
}
