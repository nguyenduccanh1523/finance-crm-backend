import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'conversation_members' })
export class ConversationMember {
  @PrimaryColumn({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @PrimaryColumn({ name: 'membership_id', type: 'uuid' })
  membershipId: string;
}
