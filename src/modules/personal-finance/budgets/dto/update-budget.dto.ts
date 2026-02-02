import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class UpdateBudgetDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  amountLimitCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  alertThresholdPercent?: number;
}
