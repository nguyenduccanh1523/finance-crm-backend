import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { jwtConfig } from '../../../../config/jwt.config';

function cookieExtractor(req: Request): string | null {
  if (req && req.cookies && req.cookies['access_token']) {
    return req.cookies['access_token'];
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessSecret,
    });
  }

  async validate(payload: any) {
    // trả ra user cho request.user
    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
    };
  }
}
