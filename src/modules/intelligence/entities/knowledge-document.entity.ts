import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { KnowledgeChunk } from './knowledge-chunk.entity';

@Entity({ name: 'knowledge_documents' })
@Index(['workspaceId', 'sourceType', 'sourceRef'], { unique: true })
@Index(['workspaceId', 'status'])
export class KnowledgeDocument extends BaseEntity {
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @Column({ name: 'source_type', type: 'text' })
  sourceType!: string;
  // ví dụ: budget_snapshot, monthly_summary, goal_progress, manual_note

  @Column({ name: 'source_ref', type: 'text' })
  sourceRef!: string;
  // ví dụ: budget-<budgetId>-2026-04, summary-2026-04

  @Column({ type: 'text', nullable: true })
  title?: string | null;

  @Column({ name: 'raw_text', type: 'text' })
  rawText!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, any>;

  @Column({ type: 'text', default: 'ACTIVE' })
  status!: string;

  @OneToMany(() => KnowledgeChunk, (chunk) => chunk.document, {
    cascade: ['remove'],
  })
  chunks!: KnowledgeChunk[];
}
