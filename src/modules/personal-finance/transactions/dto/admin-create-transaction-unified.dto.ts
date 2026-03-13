import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsArray,
} from 'class-validator';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';

type AdminTransactionScope = 'user' | 'workspace';

export class AdminCreateTransactionDto {
  @IsEnum(['user', 'workspace'])
  scope: AdminTransactionScope;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsNumber()
  amountCents?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  occurredAt?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  counterparty?: string;

  @IsOptional()
  @IsUUID()
  transferAccountId?: string;

  @IsOptional()
  @IsArray()
  tagIds?: string[];

  // For workspace or user scope
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
