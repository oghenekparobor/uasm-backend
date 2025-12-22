import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardStatsDto, DashboardPeriod } from './dto/dashboard-stats.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/stats
   * Get comprehensive dashboard statistics
   * Returns different stats based on user role
   *
   * Query params:
   * - period: today | week | month | year | all (default: all)
   * - startDate: ISO date string (optional, overrides period)
   * - endDate: ISO date string (optional, overrides period)
   */
  @Get('stats')
  getStats(
    @AuthUser() user: AuthenticatedUser,
    @Query() dto: DashboardStatsDto,
  ) {
    return this.dashboardService.getStats(user, dto.period);
  }

  /**
   * GET /dashboard/overview
   * Get quick overview statistics (counts only)
   * Faster endpoint for dashboard widgets
   */
  @Get('overview')
  getOverview(@AuthUser() user: AuthenticatedUser) {
    return this.dashboardService.getOverview(user);
  }
}

