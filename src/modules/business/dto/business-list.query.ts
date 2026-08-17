import { Transform } from 'class-transformer';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/** Common, indexed list/search contract used by every business collection. */
export class BusinessListQuery extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  order?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';

  /** URL-encoded JSON exact-match filters. Only entity columns are accepted. */
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return value; }
  })
  @IsObject()
  filters?: Record<string, string>;
}
