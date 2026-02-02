import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  Max,
} from 'class-validator';

export class CreateBudgetDto {
  @IsDateString()
  periodMonth: string; // YYYY-MM-01 recommended

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsInt()
  @Min(0)
  amountLimitCents: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  alertThresholdPercent?: number;
}
