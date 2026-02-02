import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Min,
  IsInt,
} from 'class-validator';
import { AccountType } from '../../../../common/enums/account-type.enum';

/**
 * SUPER_ADMIN: fields optional as requested.
 * Service will auto-fill defaults.
 */
export class AdminCreateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  openingBalanceCents?: number;
}
