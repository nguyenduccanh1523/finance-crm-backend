import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Membership } from '../core/rbac/membership.entity';
import { BusinessListQuery } from './dto/business-list.query';
import { BUSINESS_RESOURCES } from './business-resources';

@Injectable()
export class BusinessCrudService {
  constructor(private readonly dataSource: DataSource) {}

  private async membership(orgId: string, userId: string) {
    const membership = await this.dataSource.getRepository(Membership).findOne({ where: { orgId, userId, status: 1 } });
    if (!membership) throw new NotFoundException('Active organization membership was not found');
    return membership;
  }

  private resource(name: string) {
    const resource = BUSINESS_RESOURCES[name];
    if (!resource) throw new NotFoundException(`Unknown business resource: ${name}`);
    return resource;
  }

  private safePayload(name: string, payload: Record<string, unknown>, orgId: string, membership: Membership, userId: string) {
    const resource = this.resource(name);
    const metadata = this.dataSource.getMetadata(resource.entity);
    const permitted = new Set(metadata.columns.map((column) => column.propertyName));
    const protectedFields = new Set(['id', 'orgId', 'createdAt', 'updatedAt', 'deletedAt', ...(resource.membershipFields || []), ...(resource.userFields || [])]);
    const clean = Object.fromEntries(Object.entries(payload || {}).filter(([key]) => permitted.has(key) && !protectedFields.has(key)));
    Object.assign(clean, { orgId });
    for (const field of resource.membershipFields || []) clean[field] = membership.id;
    for (const field of resource.userFields || []) clean[field] = userId;
    return clean;
  }

  async list(name: string, orgId: string, userId: string, query: BusinessListQuery) {
    await this.membership(orgId, userId);
    const resource = this.resource(name);
    const repository = this.dataSource.getRepository(resource.entity);
    const metadata = repository.metadata;
    const columns = new Set(metadata.columns.map((column) => column.propertyName));
    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = columns.has(query.sortBy || '') ? query.sortBy! : 'createdAt';
    const qb = repository.createQueryBuilder('item').where('item.org_id = :orgId', { orgId });
    if (query.q && resource.searchColumns.length) {
      const searchable = resource.searchColumns.filter((field) => columns.has(field));
      qb.andWhere(`(${searchable.map((field) => `CAST(item.${metadata.findColumnWithPropertyName(field)!.databaseName} AS text) ILIKE :q`).join(' OR ')})`, { q: `%${query.q.trim()}%` });
    }
    for (const [key, value] of Object.entries(query.filters || {})) {
      const column = metadata.findColumnWithPropertyName(key);
      if (column && value !== undefined) qb.andWhere(`item.${column.databaseName} = :filter_${key}`, { [`filter_${key}`]: value });
    }
    const [data, total] = await qb.orderBy(`item.${metadata.findColumnWithPropertyName(sortBy)!.databaseName}`, (query.order || 'DESC').toUpperCase() as 'ASC' | 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { statusCode: 200, message: 'Business resources retrieved', data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async get(name: string, id: string, orgId: string, userId: string) {
    await this.membership(orgId, userId);
    const item = await this.dataSource.getRepository(this.resource(name).entity).findOne({ where: { id, orgId } as any });
    if (!item) throw new NotFoundException('Resource not found');
    return { statusCode: 200, message: 'Business resource retrieved', data: item };
  }

  async create(name: string, orgId: string, userId: string, payload: Record<string, unknown>) {
    const membership = await this.membership(orgId, userId);
    const repository = this.dataSource.getRepository(this.resource(name).entity);
    const item = repository.create(this.safePayload(name, payload, orgId, membership, userId));
    return { statusCode: 201, message: 'Business resource created', data: await repository.save(item) };
  }

  async update(name: string, id: string, orgId: string, userId: string, payload: Record<string, unknown>) {
    const membership = await this.membership(orgId, userId);
    const repository = this.dataSource.getRepository(this.resource(name).entity);
    const item = await repository.findOne({ where: { id, orgId } as any });
    if (!item) throw new NotFoundException('Resource not found');
    Object.assign(item, this.safePayload(name, payload, orgId, membership, userId));
    return { statusCode: 200, message: 'Business resource updated', data: await repository.save(item) };
  }

  async remove(name: string, id: string, orgId: string, userId: string) {
    await this.membership(orgId, userId);
    const repository = this.dataSource.getRepository(this.resource(name).entity);
    const item = await repository.findOne({ where: { id, orgId } as any });
    if (!item) throw new NotFoundException('Resource not found');
    if (repository.metadata.deleteDateColumn) await repository.softRemove(item);
    else await repository.remove(item);
    return { statusCode: 200, message: 'Business resource deleted', data: null };
  }
}
