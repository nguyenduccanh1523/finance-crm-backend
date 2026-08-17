import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { CustomerType } from '../../../common/enums/business.enums';
import {
  AuthenticatedUser,
  OrganizationContextService,
} from '../../core/organizations/organization-context.service';
import { Membership } from '../../core/rbac/membership.entity';
import { User } from '../../core/users/user.entity';
import { CrmCustomer } from '../crm/entities/crm-customer.entity';
import {
  CreateCrmCustomerDto,
  ListCrmCustomersQueryDto,
  UpdateCrmCustomerDto,
  CRM_CUSTOMER_STAGES,
} from './dto/crm-customer.dto';

type CustomerRow = {
  id: string;
  name: string;
  type: CustomerType;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  stage: string;
  estimatedValueCents: string;
  ownerMembershipId: string;
  ownerName: string;
  ownerEmail: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CrmCustomersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly organizationContext: OrganizationContextService,
  ) {}

  private async organizationId(
    user: AuthenticatedUser,
    activeOrgId?: string,
    fallbackOrgId?: string,
  ) {
    const context = await this.organizationContext.resolveDashboardOrganization(
      user,
      activeOrgId,
      fallbackOrgId,
    );
    return context.organization.id;
  }

  private baseQuery(orgId: string): SelectQueryBuilder<CrmCustomer> {
    return this.dataSource
      .getRepository(CrmCustomer)
      .createQueryBuilder('customer')
      .innerJoin(
        Membership,
        'ownerMembership',
        'ownerMembership.id = customer.owner_membership_id',
      )
      .innerJoin(User, 'ownerUser', 'ownerUser.id = ownerMembership.user_id')
      .where('customer.org_id = :orgId', { orgId })
      .select([
        'customer.id AS "id"',
        'customer.name AS "name"',
        'customer.type AS "type"',
        'customer.industry AS "industry"',
        'customer.website AS "website"',
        'customer.phone AS "phone"',
        'customer.email AS "email"',
        'customer.address AS "address"',
        'customer.stage AS "stage"',
        'customer.estimated_value_cents AS "estimatedValueCents"',
        'customer.owner_membership_id AS "ownerMembershipId"',
        'ownerUser.full_name AS "ownerName"',
        'ownerUser.email AS "ownerEmail"',
        'customer.created_at AS "createdAt"',
        'customer.updated_at AS "updatedAt"',
      ]);
  }

  private async getById(orgId: string, id: string) {
    const customer = await this.baseQuery(orgId)
      .andWhere('customer.id = :id', { id })
      .getRawOne<CustomerRow>();
    if (!customer) throw new NotFoundException('Client not found');
    return customer;
  }

  private async assertOwner(orgId: string, membershipId: string) {
    const owner = await this.dataSource.getRepository(Membership).findOne({
      where: { id: membershipId, orgId, status: 1 },
    });
    if (!owner) {
      throw new BadRequestException(
        'Client owner must be an active member of the selected organization',
      );
    }
    return owner;
  }

  private async defaultOwner(orgId: string, userId: string) {
    const owner = await this.dataSource.getRepository(Membership).findOne({
      where: { orgId, userId, status: 1 },
    });
    if (!owner) {
      throw new BadRequestException(
        'Choose an owner because your account is not a member of this organization',
      );
    }
    return owner.id;
  }

  private optionalText(value: string | null | undefined) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const normalized = value.trim();
    return normalized || null;
  }

  private createPayload(dto: CreateCrmCustomerDto, ownerMembershipId: string) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Client name cannot be empty');
    return {
      name,
      type: dto.type,
      stage: dto.stage,
      ownerMembershipId,
      industry: this.optionalText(dto.industry),
      website: this.optionalText(dto.website),
      phone: this.optionalText(dto.phone),
      email: this.optionalText(dto.email)?.toLowerCase() ?? null,
      address: this.optionalText(dto.address),
      estimatedValueCents: dto.estimatedValueCents || '0',
    };
  }

  private updatePayload(dto: UpdateCrmCustomerDto) {
    const payload: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Client name cannot be empty');
      payload.name = name;
    }
    if (dto.type !== undefined) payload.type = dto.type;
    if (dto.stage !== undefined) payload.stage = dto.stage;
    for (const key of ['industry', 'website', 'phone', 'address'] as const) {
      if (dto[key] !== undefined) payload[key] = this.optionalText(dto[key]);
    }
    if (dto.email !== undefined) {
      payload.email = this.optionalText(dto.email)?.toLowerCase() ?? null;
    }
    if (dto.estimatedValueCents !== undefined) {
      payload.estimatedValueCents = dto.estimatedValueCents;
    }
    return payload;
  }

  async list(
    user: AuthenticatedUser,
    activeOrgId: string | undefined,
    fallbackOrgId: string | undefined,
    query: ListCrmCustomersQueryDto,
  ) {
    const orgId = await this.organizationId(user, activeOrgId, fallbackOrgId);
    const qb = this.baseQuery(orgId);
    const search = query.q?.trim();
    if (search) {
      qb.andWhere(
        `(customer.name ILIKE :search
          OR COALESCE(customer.email, '') ILIKE :search
          OR COALESCE(customer.phone, '') ILIKE :search
          OR COALESCE(customer.industry, '') ILIKE :search
          OR COALESCE(customer.website, '') ILIKE :search)`,
        { search: `%${search}%` },
      );
    }
    if (query.stage) qb.andWhere('customer.stage = :stage', { stage: query.stage });
    if (query.type) qb.andWhere('customer.type = :type', { type: query.type });
    if (query.ownerMembershipId) {
      qb.andWhere('customer.owner_membership_id = :ownerMembershipId', {
        ownerMembershipId: query.ownerMembershipId,
      });
    }

    const total = await qb.clone().getCount();
    const sortColumns = {
      name: 'customer.name',
      stage: 'customer.stage',
      createdAt: 'customer.created_at',
      updatedAt: 'customer.updated_at',
    };
    const data = await qb
      .orderBy(sortColumns[query.sortBy], query.order)
      .addOrderBy('customer.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getRawMany<CustomerRow>();

    return {
      statusCode: 200,
      message: 'Clients retrieved successfully',
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async get(
    user: AuthenticatedUser,
    activeOrgId: string | undefined,
    fallbackOrgId: string | undefined,
    id: string,
  ) {
    const orgId = await this.organizationId(user, activeOrgId, fallbackOrgId);
    return {
      statusCode: 200,
      message: 'Client retrieved successfully',
      data: await this.getById(orgId, id),
    };
  }

  async create(
    user: AuthenticatedUser,
    activeOrgId: string | undefined,
    fallbackOrgId: string | undefined,
    dto: CreateCrmCustomerDto,
  ) {
    const orgId = await this.organizationId(user, activeOrgId, fallbackOrgId);
    const ownerMembershipId =
      dto.ownerMembershipId || (await this.defaultOwner(orgId, user.id));
    await this.assertOwner(orgId, ownerMembershipId);
    const customer = await this.dataSource.getRepository(CrmCustomer).save(
      this.dataSource.getRepository(CrmCustomer).create({
        orgId,
        ...this.createPayload(dto, ownerMembershipId),
      }),
    );
    return {
      statusCode: 201,
      message: 'Client created successfully',
      data: await this.getById(orgId, customer.id),
    };
  }

  async update(
    user: AuthenticatedUser,
    activeOrgId: string | undefined,
    fallbackOrgId: string | undefined,
    id: string,
    dto: UpdateCrmCustomerDto,
  ) {
    const orgId = await this.organizationId(user, activeOrgId, fallbackOrgId);
    await this.getById(orgId, id);
    if (dto.ownerMembershipId) await this.assertOwner(orgId, dto.ownerMembershipId);
    await this.dataSource.getRepository(CrmCustomer).update(
      { id, orgId },
      { ...this.updatePayload(dto), ...(dto.ownerMembershipId ? { ownerMembershipId: dto.ownerMembershipId } : {}) },
    );
    return {
      statusCode: 200,
      message: 'Client updated successfully',
      data: await this.getById(orgId, id),
    };
  }

  async remove(
    user: AuthenticatedUser,
    activeOrgId: string | undefined,
    fallbackOrgId: string | undefined,
    id: string,
  ) {
    const orgId = await this.organizationId(user, activeOrgId, fallbackOrgId);
    const result = await this.dataSource
      .getRepository(CrmCustomer)
      .createQueryBuilder()
      .softDelete()
      .where('id = :id AND org_id = :orgId AND deleted_at IS NULL', {
        id,
        orgId,
      })
      .execute();
    if (!result.affected) throw new NotFoundException('Client not found');
    return { statusCode: 200, message: 'Client deleted successfully', data: null };
  }

  async summary(
    user: AuthenticatedUser,
    activeOrgId?: string,
    fallbackOrgId?: string,
  ) {
    const orgId = await this.organizationId(user, activeOrgId, fallbackOrgId);
    const [summary] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS "totalClients",
              COUNT(*) FILTER (WHERE stage = 'LEAD')::int AS "newLeads",
              COUNT(*) FILTER (WHERE stage IN ('QUALIFIED', 'PROPOSAL', 'NEGOTIATION'))::int AS "followUp",
              COUNT(*) FILTER (WHERE stage = 'WON')::int AS "wonClients",
              COALESCE(SUM(estimated_value_cents), 0)::text AS "totalEstimatedValueCents"
         FROM crm_customers
        WHERE org_id = $1 AND deleted_at IS NULL`,
      [orgId],
    );
    return { statusCode: 200, message: 'Client summary retrieved successfully', data: summary };
  }

  async metadata(
    user: AuthenticatedUser,
    activeOrgId?: string,
    fallbackOrgId?: string,
  ) {
    const orgId = await this.organizationId(user, activeOrgId, fallbackOrgId);
    const owners = await this.dataSource.query(
      `SELECT m.id, u.full_name AS name, u.email,
              COALESCE(r.name, 'ORG_MEMBER') AS role
         FROM memberships m
         INNER JOIN users u ON u.id = m.user_id
         LEFT JOIN roles r ON r.id = m.role_id
        WHERE m.org_id = $1 AND m.status = 1
        ORDER BY u.full_name, u.email`,
      [orgId],
    );
    return {
      statusCode: 200,
      message: 'Client metadata retrieved successfully',
      data: { stages: CRM_CUSTOMER_STAGES, types: Object.values(CustomerType), owners },
    };
  }
}
