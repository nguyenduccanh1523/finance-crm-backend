import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'project_members' })
export class ProjectMember {
  @PrimaryColumn({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @PrimaryColumn({ name: 'membership_id', type: 'uuid' })
  membershipId: string;

  @Column({ name: 'project_role', type: 'text', nullable: true })
  projectRole?: string;
}
