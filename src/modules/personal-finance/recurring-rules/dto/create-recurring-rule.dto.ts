import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';

export class CreateRecurringRuleDto {
  @IsUUID()
  accountId: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsEnum(TransactionType)
  type: TransactionType; // INCOME/EXPENSE (TRANSFER not recommended)

  @IsInt()
  @Min(0)
  amountCents: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsString()
  rrule: string; // RFC5545 RRULE

  @IsDateString()
  nextRunAt: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;
}
