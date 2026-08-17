import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { CustomerType } from '../../../../common/enums/business.enums';

export const CRM_CUSTOMER_STAGES = [
  'LEAD',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;

export type CrmCustomerStage = (typeof CRM_CUSTOMER_STAGES)[number];

export class CreateCrmCustomerDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsEnum(CustomerType)
  type!: CustomerType;

  @IsIn(CRM_CUSTOMER_STAGES)
  stage!: CrmCustomerStage;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @IsOptional()
  @IsUUID()
  ownerMembershipId?: string;

  /** Integer cents, represented as a string to preserve bigint precision. */
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  estimatedValueCents?: string;
}

export class UpdateCrmCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @IsOptional()
  @IsIn(CRM_CUSTOMER_STAGES)
  stage?: CrmCustomerStage;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string | null;

  @IsOptional()
  @IsUUID()
  ownerMembershipId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  estimatedValueCents?: string;
}

export class ListCrmCustomersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsIn(CRM_CUSTOMER_STAGES)
  stage?: CrmCustomerStage;

  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @IsOptional()
  @IsUUID()
  ownerMembershipId?: string;

  @IsOptional()
  @IsIn(['name', 'stage', 'createdAt', 'updatedAt'])
  sortBy: 'name' | 'stage' | 'createdAt' | 'updatedAt' = 'updatedAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'DESC';
}
