import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ name: 'attachments' })
@Index(['ownerType', 'ownerId'])
export class Attachment extends BaseEntity {
  @Column({ name: 'owner_type', type: 'text' })
  ownerType: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string;

  @Column({ type: 'text' })
  mime: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: number;
}
