import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination.dto';

export class WorkListQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsUUID() statusId?: string;
}

export class CreateProjectDto {
  @IsString() @MaxLength(180) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsUUID() statusId?: string;
  @IsOptional() @IsUUID() ownerMembershipId?: string;
  @IsOptional() @IsString() budgetCents?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) estimateMinutes?: number;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  @IsOptional() @IsUUID() statusId?: string;
  @IsOptional() @IsUUID() ownerMembershipId?: string;
  @IsOptional() @IsString() budgetCents?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) estimateMinutes?: number | null;
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) memberMembershipIds?: string[];
}

export class CreateTaskDto {
  @IsUUID() projectId!: string;
  @IsString() @MaxLength(240) title!: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsUUID() statusId?: string;
  @IsOptional() @IsUUID() workTypeId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(3) priority?: number;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) estimateMinutes?: number;
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) assigneeMembershipIds?: string[];
}

export class UpdateTaskDto {
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsString() @MaxLength(240) title?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string | null;
  @IsOptional() @IsUUID() statusId?: string;
  @IsOptional() @IsUUID() workTypeId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(3) priority?: number;
  @IsOptional() @IsDateString() dueAt?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) estimateMinutes?: number | null;
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) assigneeMembershipIds?: string[];
}

export class CreateTimesheetDto {
  @IsOptional() @IsUUID() taskId?: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsUUID() workTypeId?: string;
  @IsOptional() @IsUUID() membershipId?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1440) minutes!: number;
  @IsDateString() workDate!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class UpdateTimesheetDto extends CreateTimesheetDto {}
