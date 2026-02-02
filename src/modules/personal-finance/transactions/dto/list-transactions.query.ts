import {
  IsDateString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsString,
} from 'class-validator';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';

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
  q?: string; // note/counterparty
}
