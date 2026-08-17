import { DataSource } from 'typeorm';
import { OrganizationContextService } from '../../core/organizations/organization-context.service';
import { BusinessDashboardService } from './business-dashboard.service';

describe('BusinessDashboardService', () => {
  const organization = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Acme',
    currency: 'VND',
    timezone: 'Asia/Ho_Chi_Minh',
  };

  it('uses the resolved active organization context and returns chart-ready data', async () => {
    const query = jest.fn((sql: string) => {
      if (sql.includes('AS active_clients')) {
        return Promise.resolve([
          {
            active_clients: 128,
            clients_this_month: 12,
            running_projects: 24,
            high_priority_tasks: 8,
            tasks_done: 342,
            tasks_done_today: 18,
            monthly_revenue: '4280000',
            previous_month_revenue: '4000000',
            monthly_tasks: 100,
            monthly_tasks_done: 76,
          },
        ]);
      }
      if (sql.includes('GROUP BY stage')) {
        return Promise.resolve([{ stage: 'Lead', deals: 42 }]);
      }
      if (sql.includes("UPPER(s.entity_type) = 'TASK'")) {
        return Promise.resolve([{ name: 'Done', tasks: 342 }]);
      }
      return Promise.resolve([]);
    });
    const resolveDashboardOrganization = jest.fn().mockResolvedValue({
      organization,
      accessRole: 'ORG_ADMIN',
    });
    const service = new BusinessDashboardService(
      { query } as unknown as DataSource,
      { resolveDashboardOrganization } as unknown as OrganizationContextService,
    );

    const result = await service.getDashboard(
      { id: 'user-id' },
      organization.id,
    );

    expect(resolveDashboardOrganization).toHaveBeenCalledWith(
      { id: 'user-id' },
      organization.id,
      undefined,
    );
    expect(result.data.accessRole).toBe('ORG_ADMIN');
    expect(result.data.kpis.activeClients.value).toBe(128);
    expect(result.data.summary.monthlyTaskCompletionPercent).toBe(76);
    expect(result.data.charts.salesPipeline).toEqual({
      type: 'bar',
      labels: ['Lead'],
      series: [{ name: 'Deals', data: [42] }],
    });
  });
});
