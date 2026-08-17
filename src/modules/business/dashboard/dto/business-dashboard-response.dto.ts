import { ApiProperty } from '@nestjs/swagger';

class DashboardMetricDto {
  @ApiProperty({ example: 128 }) value: number;
  @ApiProperty({ example: 12 }) change: number;
  @ApiProperty({ example: '+12 this month' }) changeLabel: string;
}

class RevenueMetricDto {
  @ApiProperty({ example: '4280000', description: 'Integer cents as string' })
  amountCents: string;
  @ApiProperty({ example: 'VND' }) currency: string;
  @ApiProperty({ example: 9.4 }) changePercent: number;
  @ApiProperty({ example: '+9.4%' }) changeLabel: string;
}

class DashboardKpisDto {
  @ApiProperty({ type: DashboardMetricDto }) activeClients: DashboardMetricDto;
  @ApiProperty({ type: DashboardMetricDto })
  runningProjects: DashboardMetricDto;
  @ApiProperty({ type: DashboardMetricDto }) tasksDone: DashboardMetricDto;
  @ApiProperty({ type: RevenueMetricDto }) monthlyRevenue: RevenueMetricDto;
}

class WorkloadItemDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Website redesign' }) task: string;
  @ApiProperty({ example: 'Design', nullable: true }) module: string | null;
  @ApiProperty({ example: '2026-08-15T08:00:00.000Z', nullable: true })
  dueAt: Date | null;
  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'], example: 'HIGH' })
  priority: string;
  @ApiProperty({ example: 'In progress', nullable: true }) status:
    | string
    | null;
}

class TodayWorkloadDto {
  @ApiProperty({ example: 4 }) total: number;
  @ApiProperty({ type: [WorkloadItemDto] }) items: WorkloadItemDto[];
}

class PipelineStageDto {
  @ApiProperty({ example: 'Lead' }) stage: string;
  @ApiProperty({ example: 42 }) deals: number;
  @ApiProperty({ example: 46.67 }) percentage: number;
}

class SalesPipelineDto {
  @ApiProperty({ example: 90 }) totalDeals: number;
  @ApiProperty({ type: [PipelineStageDto] }) stages: PipelineStageDto[];
}

class QuickFocusDto {
  @ApiProperty({ example: 14 }) followUpClients: number;
  @ApiProperty({ example: 6 }) pendingInvoices: number;
  @ApiProperty({ example: 9 }) timesheetsWaiting: number;
}

class BottomSummaryDto {
  @ApiProperty({ example: 7 }) upcomingMeetings: number;
  @ApiProperty({ example: 5 }) lateTimesheets: number;
  @ApiProperty({ example: 76 }) monthlyTaskCompletionPercent: number;
}

class ChartSeriesDto {
  @ApiProperty({ example: 'Deals' }) name: string;
  @ApiProperty({ type: [Number], example: [42, 26, 14, 8] }) data: number[];
}

class ChartDto {
  @ApiProperty({ enum: ['bar', 'line', 'doughnut'], example: 'bar' })
  type: string;
  @ApiProperty({
    type: [String],
    example: ['Lead', 'Qualified', 'Proposal', 'Closed'],
  })
  labels: string[];
  @ApiProperty({ type: [ChartSeriesDto] }) series: ChartSeriesDto[];
}

class DashboardChartsDto {
  @ApiProperty({ type: ChartDto }) salesPipeline: ChartDto;
  @ApiProperty({ type: ChartDto }) tasksByStatus: ChartDto;
  @ApiProperty({ type: ChartDto }) cashFlowLast6Months: ChartDto;
}

class DashboardOrganizationDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Three Nest CRM' }) name: string;
  @ApiProperty({ example: 'VND' }) currency: string;
  @ApiProperty({ example: 'Asia/Ho_Chi_Minh' }) timezone: string;
}

export class BusinessDashboardDataDto {
  @ApiProperty({ type: DashboardOrganizationDto })
  organization: DashboardOrganizationDto;
  @ApiProperty({
    example: 'ORG_ADMIN',
    enum: ['ORG_ADMIN', 'SUPER_ADMIN', 'TESTER'],
  })
  accessRole: string;
  @ApiProperty({ example: '2026-08-15T15:30:00.000Z' }) generatedAt: string;
  @ApiProperty({ type: DashboardKpisDto }) kpis: DashboardKpisDto;
  @ApiProperty({ type: TodayWorkloadDto }) todayWorkload: TodayWorkloadDto;
  @ApiProperty({ type: SalesPipelineDto }) salesPipeline: SalesPipelineDto;
  @ApiProperty({ type: QuickFocusDto }) quickFocus: QuickFocusDto;
  @ApiProperty({ type: BottomSummaryDto }) summary: BottomSummaryDto;
  @ApiProperty({ type: DashboardChartsDto }) charts: DashboardChartsDto;
}

export class BusinessDashboardResponseDto {
  @ApiProperty({ example: 200 }) statusCode: number;
  @ApiProperty({ example: 'Business dashboard retrieved successfully' })
  message: string;
  @ApiProperty({ type: BusinessDashboardDataDto })
  data: BusinessDashboardDataDto;
}
