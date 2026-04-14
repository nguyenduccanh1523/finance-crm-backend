import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

/**
 * Standard pagination query parameters
 * Used for filtering list/search requests
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Standard pagination metadata in response
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standard paginated response
 * For list/search endpoints that return multiple items
 */
export interface PaginatedResponse<T = any> {
  statusCode: number;
  message: string;
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Standard single resource response
 * For get/create/update endpoints that return single item
 */
export interface SingleResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
}

/**
 * Standard response without data
 * For delete operations
 */
export interface EmptyResponse {
  statusCode: number;
  message: string;
}
