export const cookieConfig = {
  httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: (process.env.COOKIE_SAME_SITE || 'lax') as
    | 'lax'
    | 'strict'
    | 'none',
  domain: process.env.COOKIE_DOMAIN || undefined,
};
