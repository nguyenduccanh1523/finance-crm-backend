import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { KnowledgeDocument } from './knowledge-document.entity';

@Entity({ name: 'knowledge_chunks' })
@Index(['workspaceId'])
@Index(['documentId', 'chunkIndex'], { unique: true })
@Index(['workspaceId', 'isActive'])
export class KnowledgeChunk extends BaseEntity {
  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @ManyToOne('KnowledgeDocument', 'chunks', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document!: KnowledgeDocument;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @Column({ name: 'chunk_index', type: 'integer' })
  chunkIndex!: number;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'token_count', type: 'integer', default: 0 })
  tokenCount!: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, any>;

  @Column({
    type: 'vector',
    length: 384,
    nullable: true,
  })
  embedding?: number[] | Buffer | null;

  @Column({
    name: 'content_tsv',
    type: 'tsvector',
    nullable: true,
    select: false,
  })
  contentTsv?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
