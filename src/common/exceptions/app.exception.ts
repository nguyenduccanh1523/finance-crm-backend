import { HttpException, HttpStatus } from '@nestjs/common';
import { AppErrorCode } from '../errors/app-error-codes';

export class AppException extends HttpException {
  public readonly code: AppErrorCode;

  constructor(
    code: AppErrorCode,
    status: HttpStatus,
    message?: string, // cho phép override
  ) {
    super(message || code, status);
    this.code = code;
  }
}
