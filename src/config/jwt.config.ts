export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: number;        // giây
  refreshExpiresIn: number;       // giây
}

export const jwtConfig: JwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
  // 15 phút
  accessExpiresIn: Number(process.env.JWT_ACCESS_EXPIRES_IN) || 15 * 60,
  // 30 ngày
  refreshExpiresIn:
    Number(process.env.JWT_REFRESH_EXPIRES_IN) || 30 * 24 * 60 * 60,
};
