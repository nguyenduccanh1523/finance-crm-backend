import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/soft-delete.entity';
import { PersonalWorkspace } from './personal-workspace.entity';

@Entity({ name: 'tags' })
@Index(['workspaceId', 'name'], { unique: true })
export class Tag extends SoftDeleteEntity {
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => PersonalWorkspace, { onDelete: 'CASCADE' })
  workspace: PersonalWorkspace;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  color?: string;
}
