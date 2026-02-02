import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Patch 1 quota key.
 * - key: quota key string, e.g. "personal.transactions.monthly"
 * - value: non-negative integer
 * - propagate: if true => apply to tier and higher tiers (starter->pro->enterprise)
 */
export class PatchPlanQuotaDto {
  @IsString()
  key: string;

  @IsInt()
  @Min(0)
  value: number;

  @IsOptional()
  @IsBoolean()
  propagate?: boolean;
}
