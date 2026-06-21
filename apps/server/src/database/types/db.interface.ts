import { DB } from '@likh/db/types/db';
import { PageEmbeddings } from '@likh/db/types/embeddings.types';

export interface DbInterface extends DB {
  pageEmbeddings: PageEmbeddings;
}
