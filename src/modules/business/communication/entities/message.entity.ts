import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'messages' })
@Index(['conversationId', 'sentAt'])
export class Message extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'sender_membership_id', type: 'uuid' })
  senderMembershipId: string;

  @Column() body: string;

  @Column({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;
}
