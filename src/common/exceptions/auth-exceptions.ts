import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { AppErrorCode } from '../errors/app-error-codes';

export class InvalidCredentialsException extends AppException {
  constructor() {
    super(AppErrorCode.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
  }
}

export class UserNotFoundException extends AppException {
  constructor() {
    super(AppErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
}
