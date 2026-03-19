import {
  IsDateString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';
import { Type } from 'class-transformer';

export class ListTransactionsQuery {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  q?: string; // note/counterparty search

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1; // Default: 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20; // Default: 20, Max: 100

  @IsOptional()
  @IsEnum(['occurredAt', 'amountCents', 'createdAt', 'updatedAt'])
  sortBy?: string = 'occurredAt'; // Default: occurredAt

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC'; // Default: DESC (latest first)
}
