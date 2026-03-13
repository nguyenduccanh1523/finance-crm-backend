import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { AccountType } from '../../../../common/enums/account-type.enum';

type AdminAccountScope = 'user' | 'workspace';

export class AdminCreateAccountDto {
  @IsString()
  name: string;

  @IsEnum(['user', 'workspace'])
  scope: AdminAccountScope;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalanceCents?: number;

  // For workspace or user scope
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
