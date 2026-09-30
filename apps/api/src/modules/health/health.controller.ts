import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthCheckResult } from '@sdms/shared-types';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Overall system health check' })
  @ApiResponse({ status: 200, description: 'Health check result' })
  async getHealth(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  getLiveness(): { status: string; uptime: number } {
    return this.healthService.isLive();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready to handle traffic' })
  async getReadiness(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
