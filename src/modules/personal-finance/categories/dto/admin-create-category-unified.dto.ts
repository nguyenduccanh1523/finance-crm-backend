import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';
import { CategoryKind } from '../../../../common/enums/category-kind.enum';

type AdminCategoryScope = 'global' | 'workspace' | 'user';

export class AdminCreateCategoryDto {
  @IsString()
  name: string;

  @IsEnum(CategoryKind)
  kind: CategoryKind;

  @IsEnum(['global', 'workspace', 'user'])
  scope: AdminCategoryScope;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  // For workspace or user scope
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
