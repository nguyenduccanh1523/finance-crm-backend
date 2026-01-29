import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../../rbac/membership.entity';
import { RolePermission } from '../../rbac/role-permission.entity';
import { Permission } from '../../rbac/permission.entity';
import { In } from 'typeorm';
import * as cacheManager from 'cache-manager';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private readonly cache: cacheManager.Cache,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(RolePermission)
    private readonly rpRepo: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPerms =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (!requiredPerms.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // SUPER_ADMIN bypass
    if (user.roles?.includes('SUPER_ADMIN')) return true;

    const cacheKey = `perm:global:user:${user.sub}`;

    // 1️⃣ Cache HIT
    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached) {
      return requiredPerms.some((p) => cached.includes(p));
    }

    // 2️⃣ Cache MISS → DB
    const memberships = await this.membershipRepo.find({
      where: { userId: user.sub },
    });

    const roleIds = memberships
      .map((m) => m.roleId)
      .filter((id): id is string => !!id);

    if (!roleIds.length) return false;

    const rps = await this.rpRepo.find({
      where: { roleId: In(roleIds) },
    });

    if (!rps.length) return false;

    const permIds = rps.map((rp) => rp.permissionId);

    const perms = await this.permRepo.find({
      where: { id: In(permIds) },
    });

    const permCodes = perms.map((p) => p.code);

    // 3️⃣ SET CACHE
    await this.cache.set(cacheKey, permCodes, 300);

    return requiredPerms.some((p) => permCodes.includes(p));
  }
}
