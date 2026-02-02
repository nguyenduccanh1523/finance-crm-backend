import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Min,
  IsInt,
} from 'class-validator';
import { AccountType } from '../../../../common/enums/account-type.enum';

export class CreateAccountDto {
  @IsString()
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  openingBalanceCents?: number;
}
