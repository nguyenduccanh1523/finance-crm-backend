import { IsDateString, IsEnum, IsInt, IsString, Min } from 'class-validator';
import { GoalStatus } from '../../../../common/enums/goal-status.enum';

export class CreateGoalDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  targetAmountCents: number;

  @IsDateString()
  targetDate: string;

  @IsEnum(GoalStatus)
  status: GoalStatus;
}
