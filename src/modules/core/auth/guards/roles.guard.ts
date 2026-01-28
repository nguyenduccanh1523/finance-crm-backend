import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (!requiredRoles.length) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;

    const userRoles: string[] = user.roles || [];

    // SUPER_ADMIN luôn pass
    if (userRoles.includes('SUPER_ADMIN')) {
      return true;
    }

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
