export enum AppErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
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
};
