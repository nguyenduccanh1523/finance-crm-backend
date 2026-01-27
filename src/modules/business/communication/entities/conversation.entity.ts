import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { ConversationType } from '../../../../common/enums/business.enums';

@Entity({ name: 'conversations' })
export class Conversation extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column() type: ConversationType;
  @Column({ nullable: true }) title?: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;
}
