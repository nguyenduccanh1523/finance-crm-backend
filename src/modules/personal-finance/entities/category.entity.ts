import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/soft-delete.entity';
import { PersonalWorkspace } from './personal-workspace.entity';
import { CategoryKind } from '../../../common/enums/category-kind.enum';

@Entity({ name: 'categories' })
@Index(['workspaceId', 'name', 'kind'], { unique: true })
export class Category extends SoftDeleteEntity {
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => PersonalWorkspace, { onDelete: 'CASCADE' })
  workspace: PersonalWorkspace;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  kind: CategoryKind;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string;

  @Column({ type: 'text', nullable: true })
  icon?: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;
}
