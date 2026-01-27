import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { EmailDirection } from '../../../../common/enums/business.enums';

@Entity({ name: 'emails' })
@Index(['orgId', 'sentAt'])
export class Email extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column() direction: EmailDirection;

  @Column({ name: 'from_email' }) fromEmail: string;

  @Column({ name: 'to_emails', type: 'jsonb' })
  toEmails: string[];

  @Column({ name: 'cc_emails', type: 'jsonb', nullable: true })
  ccEmails?: string[];

  @Column() subject: string;
  @Column() body: string;

  @Column({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;

  @Column({ name: 'provider_msg_id', nullable: true })
  providerMsgId?: string;
}
