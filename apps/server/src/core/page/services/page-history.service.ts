import { Injectable } from '@nestjs/common';
import { PageHistoryRepo } from '@likh/db/repos/page/page-history.repo';
import { PageHistory } from '@likh/db/types/entity.types';
import { PaginationOptions } from '@likh/db/pagination/pagination-options';
import { CursorPaginationResult } from '@likh/db/pagination/cursor-pagination';

@Injectable()
export class PageHistoryService {
  constructor(private pageHistoryRepo: PageHistoryRepo) {}

  async findById(historyId: string): Promise<PageHistory> {
    return await this.pageHistoryRepo.findById(historyId, {
      includeContent: true,
    });
  }

  async findHistoryByPageId(
    pageId: string,
    paginationOptions: PaginationOptions,
  ): Promise<CursorPaginationResult<PageHistory>> {
    return this.pageHistoryRepo.findPageHistoryByPageId(
      pageId,
      paginationOptions,
    );
  }
}
