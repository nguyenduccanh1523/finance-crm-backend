export enum AppErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  BILLING_PLAN_NOT_FOUND = 'BILLING_PLAN_NOT_FOUND',
  BILLING_STRIPE_PRICE_NOT_CONFIGURED = 'BILLING_STRIPE_PRICE_NOT_CONFIGURED',
  BILLING_SUBSCRIPTION_REQUIRED = 'BILLING_SUBSCRIPTION_REQUIRED',
  BILLING_FEATURE_NOT_ALLOWED = 'BILLING_FEATURE_NOT_ALLOWED',
  BILLING_INVALID_WEBHOOK_SIGNATURE = 'BILLING_INVALID_WEBHOOK_SIGNATURE',
}

export const APP_ERROR_MESSAGES: Record<AppErrorCode, string> = {
  [AppErrorCode.UNAUTHORIZED]: 'Bạn chưa đăng nhập hoặc phiên đã hết hạn.',
  [AppErrorCode.FORBIDDEN]: 'Bạn không có quyền thực hiện hành động này.',
  [AppErrorCode.VALIDATION_FAILED]: 'Dữ liệu không hợp lệ.',
  [AppErrorCode.USER_NOT_FOUND]: 'Không tìm thấy người dùng.',
  [AppErrorCode.INVALID_CREDENTIALS]: 'Email hoặc mật khẩu không đúng.',
  [AppErrorCode.TOKEN_EXPIRED]:
    'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  [AppErrorCode.TOKEN_REVOKED]: 'Phiên đăng nhập đã bị huỷ.',
  [AppErrorCode.INTERNAL_ERROR]:
    'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.',

  [AppErrorCode.BILLING_PLAN_NOT_FOUND]: 'Không tìm thấy gói dịch vụ.',
  [AppErrorCode.BILLING_STRIPE_PRICE_NOT_CONFIGURED]:
    'Gói chưa cấu hình Stripe price.',
  [AppErrorCode.BILLING_SUBSCRIPTION_REQUIRED]:
    'Bạn cần gói trả phí hợp lệ để dùng tính năng này.',
  [AppErrorCode.BILLING_FEATURE_NOT_ALLOWED]:
    'Gói hiện tại không hỗ trợ tính năng này.',
  [AppErrorCode.BILLING_INVALID_WEBHOOK_SIGNATURE]:
    'Webhook Stripe không hợp lệ.',
};
