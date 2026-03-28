import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { GoalStatus } from '../../../../common/enums/goal-status.enum';

export class CreateGoalDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  targetAmountCents: number;

  @IsDateString()
  targetDate: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentAmountCents?: number; // default: 0

  @IsOptional()
  @IsUUID()
  accountId?: string; // Nếu không truyền, dùng primary account

  @IsEnum(GoalStatus)
  status: GoalStatus;
}
