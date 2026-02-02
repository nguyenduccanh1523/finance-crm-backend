import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { CategoryKind } from '../../../../common/enums/category-kind.enum';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsEnum(CategoryKind)
  kind: CategoryKind;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
