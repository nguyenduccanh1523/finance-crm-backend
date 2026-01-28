import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        // nếu controller đã tự trả JSON chuẩn rồi thì không wrap nữa
        if (
          data &&
          typeof data === 'object' &&
          'statusCode' in data &&
          'message' in data
        ) {
          return data;
        }

        const statusCode = res.statusCode || 200;
        return {
          statusCode,
          message: 'Success',
          data,
        };
      }),
    );
  }
}
