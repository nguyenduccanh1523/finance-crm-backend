import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { isUUID } from 'class-validator';
import { DataSource } from 'typeorm';
import { RoleScope } from '../../../common/enums/role-scope.enum';
import { PersonalWorkspace } from '../../personal-finance/entities/personal-workspace.entity';
import { User } from '../users/user.entity';
import { Membership } from '../rbac/membership.entity';
import { Role } from '../rbac/role.entity';
import { Organization } from './organization.entity';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { ProvisionOrganizationAdminDto } from './dto/provision-organization-admin.dto';

const FULL_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'TESTER']);

export interface AuthenticatedUser {
  id: string;
  roles?: string[];
}

export interface OrganizationContext {
  organization: {
    id: string;
    name: string;
    currency: string;
    timezone: string;
  };
  accessRole: string;
}

@Injectable()
export class OrganizationContextService {
  constructor(private readonly dataSource: DataSource) {}

  private globalAccessRole(user: AuthenticatedUser): string | undefined {
    return (user.roles || []).find((role) => FULL_ACCESS_ROLES.has(role));
  }

  private ensureProvisioningAccess(user: AuthenticatedUser) {
    if (!this.globalAccessRole(user)) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN and TESTER can provision an organization administrator',
      );
    }
  }

  private async findOrganization(orgId: string) {
    if (!isUUID(orgId)) {
      throw new BadRequestException('Organization id must be a valid UUID');
    }
    const rows = await this.dataSource.query(
      `SELECT id, name, currency, timezone
         FROM organizations
        WHERE id = $1 AND deleted_at IS NULL
        LIMIT 1`,
      [orgId],
    );
    if (!rows[0]) throw new NotFoundException('Organization not found');
    return rows[0];
  }

  async listAvailableOrganizations(user: AuthenticatedUser) {
    const globalRole = this.globalAccessRole(user);
    if (globalRole) {
      const rows = await this.dataSource.query(
        `SELECT id, name, currency, timezone
           FROM organizations
          WHERE deleted_at IS NULL
          ORDER BY name`,
      );
      return rows.map((organization: Record<string, unknown>) => ({
        ...organization,
        accessRole: globalRole,
      }));
    }

    return this.dataSource.query(
      `SELECT o.id, o.name, o.currency, o.timezone,
              COALESCE(r.name, 'ORG_MEMBER') AS "accessRole"
         FROM memberships m
         INNER JOIN organizations o ON o.id = m.org_id AND o.deleted_at IS NULL
         LEFT JOIN roles r ON r.id = m.role_id
        WHERE m.user_id = $1 AND m.status = 1
        ORDER BY o.name`,
      [user.id],
    );
  }

  async selectOrganization(
    user: AuthenticatedUser,
    orgId: string,
  ): Promise<OrganizationContext> {
    const organization = await this.findOrganization(orgId);
    const globalRole = this.globalAccessRole(user);
    if (globalRole) return { organization, accessRole: globalRole };

    const membership = await this.dataSource.query(
      `SELECT COALESCE(r.name, 'ORG_MEMBER') AS role
         FROM memberships m
         LEFT JOIN roles r ON r.id = m.role_id
        WHERE m.org_id = $1 AND m.user_id = $2 AND m.status = 1
        LIMIT 1`,
      [orgId, user.id],
    );
    if (!membership[0]) {
      throw new ForbiddenException(
        'You are not an active member of this organization',
      );
    }
    return { organization, accessRole: membership[0].role };
  }

  async getCurrentOrganization(
    user: AuthenticatedUser,
    activeOrgId?: string,
  ): Promise<OrganizationContext | null> {
    if (activeOrgId) return this.selectOrganization(user, activeOrgId);

    const organizations = await this.listAvailableOrganizations(user);
    if (organizations.length !== 1) return null;
    const organization = organizations[0];
    return {
      organization,
      accessRole: String(organization.accessRole),
    };
  }

  async getAutoSelectedOrganization(userId: string) {
    const rows = await this.dataSource.query(
      `SELECT m.org_id
         FROM memberships m
         INNER JOIN organizations o ON o.id = m.org_id AND o.deleted_at IS NULL
        WHERE m.user_id = $1 AND m.status = 1
        LIMIT 2`,
      [userId],
    );
    return rows.length === 1 ? (rows[0].org_id as string) : null;
  }

  async provisionOrganizationAdmin(
    actor: AuthenticatedUser,
    dto: ProvisionOrganizationAdminDto,
  ) {
    this.ensureProvisioningAccess(actor);
    const email = dto.email.trim().toLowerCase();
    const currency = (dto.currency || 'VND').trim().toUpperCase();
    const timezone = dto.timezone || 'Asia/Ho_Chi_Minh';

    return this.dataSource.transaction(async (manager) => {
      const existingUser = await manager.findOne(User, { where: { email } });
      if (existingUser) {
        throw new BadRequestException('Email already registered');
      }

      const orgAdminRole = await manager.findOne(Role, {
        where: { scope: RoleScope.ORG, name: 'ORG_ADMIN' },
      });
      const orgMemberRole = await manager.findOne(Role, {
        where: { scope: RoleScope.ORG, name: 'ORG_MEMBER' },
      });
      if (!orgAdminRole || !orgMemberRole) {
        throw new NotFoundException('Organization roles are not seeded');
      }

      const user = await manager.save(
        User,
        manager.create(User, {
          email,
          fullName: dto.fullName.trim(),
          passwordHash: await bcrypt.hash(dto.password, 10),
          status: 1,
          timezone,
          defaultCurrency: currency,
        }),
      );
      const workspace = await manager.save(
        PersonalWorkspace,
        manager.create(PersonalWorkspace, {
          userId: user.id,
          name: 'My Workspace',
          timezone,
          defaultCurrency: currency,
        }),
      );
      const organization = await manager.save(
        Organization,
        manager.create(Organization, {
          name: dto.organizationName.trim(),
          createdById: user.id,
          timezone,
          currency,
        }),
      );
      const membership = await manager.save(
        Membership,
        manager.create(Membership, {
          orgId: organization.id,
          userId: user.id,
          roleId: orgAdminRole.id,
          status: 1,
          joinedAt: new Date(),
        }),
      );

      return {
        organization: {
          id: organization.id,
          name: organization.name,
          currency: organization.currency,
          timezone: organization.timezone,
        },
        administrator: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: orgAdminRole.name,
        },
        personalWorkspace: {
          id: workspace.id,
          name: workspace.name,
        },
        membershipId: membership.id,
      };
    });
  }

  async addOrganizationMember(
    actor: AuthenticatedUser,
    activeOrgId: string | undefined,
    dto: AddOrganizationMemberDto,
  ) {
    const context = await this.resolveDashboardOrganization(actor, activeOrgId);
    const targetUser = await this.dataSource.getRepository(User).findOne({
      where: { id: dto.userId },
    });
    if (!targetUser) throw new NotFoundException('User not found');

    const existingMembership = await this.dataSource
      .getRepository(Membership)
      .findOne({
        where: { orgId: context.organization.id, userId: targetUser.id },
      });
    if (existingMembership) {
      throw new BadRequestException(
        'User is already a member of this organization',
      );
    }

    const memberRole = await this.dataSource.getRepository(Role).findOne({
      where: { scope: RoleScope.ORG, name: 'ORG_MEMBER' },
    });
    if (!memberRole)
      throw new NotFoundException('ORG_MEMBER role is not seeded');

    const membership = await this.dataSource.getRepository(Membership).save({
      orgId: context.organization.id,
      userId: targetUser.id,
      roleId: memberRole.id,
      status: 1,
      joinedAt: new Date(),
    });
    return {
      id: membership.id,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.fullName,
      },
      role: memberRole.name,
      organization: context.organization,
    };
  }

  async resolveDashboardOrganization(
    user: AuthenticatedUser,
    activeOrgId?: string,
    fallbackOrgId?: string,
  ): Promise<OrganizationContext> {
    const orgId = activeOrgId || fallbackOrgId;
    if (orgId) {
      const context = await this.selectOrganization(user, orgId);
      if (
        context.accessRole !== 'ORG_ADMIN' &&
        !FULL_ACCESS_ROLES.has(context.accessRole)
      ) {
        throw new ForbiddenException(
          'Business dashboard requires ORG_ADMIN access for this organization',
        );
      }
      return context;
    }

    const globalRole = this.globalAccessRole(user);
    const candidates = globalRole
      ? await this.dataSource.query(
          `SELECT id FROM organizations WHERE deleted_at IS NULL ORDER BY name LIMIT 2`,
        )
      : await this.dataSource.query(
          `SELECT m.org_id AS id
             FROM memberships m
             INNER JOIN roles r ON r.id = m.role_id
            WHERE m.user_id = $1 AND m.status = 1
              AND r.scope = 'ORG' AND r.name = 'ORG_ADMIN'
            LIMIT 2`,
          [user.id],
        );

    if (candidates.length === 1) {
      return this.resolveDashboardOrganization(user, candidates[0].id);
    }
    throw new BadRequestException({
      code: 'ORG_CONTEXT_REQUIRED',
      message:
        'Select an active organization first with POST /api/organizations/:orgId/select',
    });
  }
}
