export interface ApiSuccessResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
}
