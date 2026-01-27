import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../core/users/user.entity';

@Entity({ name: 'personal_workspaces' })
export class PersonalWorkspace extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'text', default: 'Asia/Ho_Chi_Minh' })
  timezone: string;

  @Column({ name: 'default_currency', type: 'char', length: 3, default: 'VND' })
  defaultCurrency: string;
}
