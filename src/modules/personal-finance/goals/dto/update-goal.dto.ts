import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { GoalStatus } from '../../../../common/enums/goal-status.enum';

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  targetAmountCents?: number;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentAmountCents?: number;

  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;
}
