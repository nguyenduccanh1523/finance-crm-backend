import { IsNumber, IsOptional, IsUUID } from 'class-validator';
export class AssignMembershipDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  orgId?: string; // nếu null → GLOBAL / PERSONAL

  @IsUUID()
  roleId: string;

  @IsNumber()
  status: number;
}
