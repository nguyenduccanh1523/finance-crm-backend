import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'attendance_records' })
@Index(['orgId'])
export class AttendanceRecord extends BaseEntity {
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ name: 'membership_id', type: 'uuid' })
  membershipId: string;

  @Column({ name: 'check_in', type: 'timestamptz' })
  checkIn: Date;

  @Column({ name: 'check_out', type: 'timestamptz', nullable: true })
  checkOut?: Date;

  @Column() status: string;
  @Column({ nullable: true }) note?: string;
}
