import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrganizationContextService } from './organization-context.service';

describe('OrganizationContextService', () => {
  const organization = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Acme',
    currency: 'VND',
    timezone: 'Asia/Ho_Chi_Minh',
  };

  it('accepts a selected organization for an active member', async () => {
    const query = jest.fn((sql: string) => {
      if (sql.includes('FROM organizations'))
        return Promise.resolve([organization]);
      if (sql.includes('FROM memberships m')) {
        return Promise.resolve([{ role: 'ORG_MEMBER' }]);
      }
      return Promise.resolve([]);
    });
    const service = new OrganizationContextService({
      query,
    } as unknown as DataSource);

    await expect(
      service.selectOrganization({ id: 'user-id' }, organization.id),
    ).resolves.toEqual({ organization, accessRole: 'ORG_MEMBER' });
  });

  it('rejects selecting an organization without active membership', async () => {
    const query = jest.fn((sql: string) => {
      if (sql.includes('FROM organizations'))
        return Promise.resolve([organization]);
      return Promise.resolve([]);
    });
    const service = new OrganizationContextService({
      query,
    } as unknown as DataSource);

    await expect(
      service.selectOrganization({ id: 'user-id' }, organization.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('auto-resolves dashboard organization only when exactly one ORG_ADMIN candidate exists', async () => {
    const query = jest.fn((sql: string) => {
      if (sql.includes('SELECT m.org_id AS id')) {
        return Promise.resolve([{ id: organization.id }]);
      }
      if (sql.includes('FROM organizations'))
        return Promise.resolve([organization]);
      if (sql.includes('FROM memberships m')) {
        return Promise.resolve([{ role: 'ORG_ADMIN' }]);
      }
      return Promise.resolve([]);
    });
    const service = new OrganizationContextService({
      query,
    } as unknown as DataSource);

    await expect(
      service.resolveDashboardOrganization({ id: 'user-id' }),
    ).resolves.toEqual({ organization, accessRole: 'ORG_ADMIN' });
  });

  it('requires an organization selection when multiple dashboard contexts exist', async () => {
    const query = jest.fn((sql: string) => {
      if (sql.includes('SELECT m.org_id AS id'))
        return Promise.resolve([{ id: '1' }, { id: '2' }]);
      return Promise.resolve([]);
    });
    const service = new OrganizationContextService({
      query,
    } as unknown as DataSource);

    await expect(
      service.resolveDashboardOrganization({ id: 'user-id' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
