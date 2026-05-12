import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: process.env.APP_NAME || 'finance-crm-backend',
      env: process.env.APP_ENV || process.env.NODE_ENV || 'local',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/ready')
  async ready() {
    const startedAt = Date.now();

    try {
      await this.dataSource.query('SELECT 1');

      return {
        status: 'ready',
        service: process.env.APP_NAME || 'finance-crm-backend',
        env: process.env.APP_ENV || process.env.NODE_ENV || 'local',
        checks: {
          api: 'ok',
          database: 'ok',
        },
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: process.env.APP_NAME || 'finance-crm-backend',
        checks: {
          api: 'ok',
          database: 'down',
        },
        errorMessage:
          error instanceof Error ? error.message : 'Unknown health check error',
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
