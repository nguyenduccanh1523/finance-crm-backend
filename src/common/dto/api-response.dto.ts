/**
 * @deprecated Use PaginatedResponse, SingleResponse, or EmptyResponse from pagination.dto instead
 */
export interface ApiSuccessResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
}

/**
 * Standard error response
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
}

/**
 * Export standardized response types from pagination module
 */
export { PaginationQueryDto } from './pagination.dto';
export type {
  PaginationMeta,
  PaginatedResponse,
  SingleResponse,
  EmptyResponse,
} from './pagination.dto';
