import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { HealthCheckResult } from '@sdms/shared-types';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatency: number | undefined;

    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'down';
    }

    return {
      status: dbStatus === 'up' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      uptime: process.uptime(),
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
        },
      },
    };
  }

  isLive(): { status: string; uptime: number } {
    return {
      status: 'ok',
      uptime: process.uptime(),
    };
  }
}
