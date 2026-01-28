import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppErrorCode, APP_ERROR_MESSAGES } from '../errors/app-error-codes';
import { AppException } from '../exceptions/app.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof AppException) {
      status = exception.getStatus();
      const code = exception.code;
      message = APP_ERROR_MESSAGES[code] || exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res['message']) {
        message = Array.isArray(res['message'])
          ? res['message'][0]
          : res['message'];
      } else {
        message = exception.message;
      }
    } else {
      // log thêm nếu muốn
      console.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      // không trả data cho lỗi
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
