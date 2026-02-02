import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception';
import { AppErrorCode } from '../../../common/errors/app-error-codes';

export const personalErrors = {
  resourceNotFound: (resource: string) =>
    new AppException(
      AppErrorCode.RESOURCE_NOT_FOUND,
      HttpStatus.NOT_FOUND,
      `Không tìm thấy ${resource}.`,
    ),

  forbidden: () =>
    new AppException(
      AppErrorCode.FORBIDDEN,
      HttpStatus.FORBIDDEN,
      'Bạn không có quyền thực hiện hành động này.',
    ),

  quotaExceeded: (key: string) =>
    new AppException(
      AppErrorCode.BILLING_QUOTA_EXCEEDED,
      HttpStatus.PAYMENT_REQUIRED,
      `Vượt giới hạn gói cho quota: ${key}`,
    ),

  invalidInput: (message = 'Dữ liệu không hợp lệ.') =>
    new AppException(
      AppErrorCode.VALIDATION_FAILED,
      HttpStatus.BAD_REQUEST,
      message,
    ),

  featureNotAllowed: (feature: string) =>
    new AppException(
      AppErrorCode.BILLING_FEATURE_NOT_ALLOWED,
      HttpStatus.PAYMENT_REQUIRED,
      `Gói hiện tại không hỗ trợ tính năng: ${feature}`,
    ),
};
