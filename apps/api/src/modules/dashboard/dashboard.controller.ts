import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { DashboardStats } from '@sdms/shared-types';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Retrieve role-aware dashboard statistics and operational metrics',
    description:
      'Aggregates case counts, expiring shares, audit ledger integrity, and recent activity tailored to the authenticated role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard aggregated metrics',
  })
  async getStats(@CurrentUser() user: AuthenticatedUser): Promise<DashboardStats> {
    return this.dashboardService.getStats(user);
  }
}
