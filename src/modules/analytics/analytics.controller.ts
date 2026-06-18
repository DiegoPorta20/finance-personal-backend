import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('spending-by-category')
  spendingByCategory(
    @CurrentUser() userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.spendingByCategory(userId, startDate, endDate);
  }

  @Get('income-by-category')
  incomeByCategory(
    @CurrentUser() userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.incomeByCategory(userId, startDate, endDate);
  }

  @Get('income-vs-expense')
  incomeVsExpense(
    @CurrentUser() userId: string,
    @Query('months') months?: string,
  ) {
    return this.analyticsService.incomeVsExpense(
      userId,
      months ? parseInt(months, 10) : 6,
    );
  }

  @Get('savings-trend')
  savingsTrend(
    @CurrentUser() userId: string,
    @Query('months') months?: string,
  ) {
    return this.analyticsService.savingsTrend(
      userId,
      months ? parseInt(months, 10) : 6,
    );
  }

  @Get('budget-status')
  budgetStatus(
    @CurrentUser() userId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.analyticsService.budgetStatus(
      userId,
      parseInt(month, 10),
      parseInt(year, 10),
    );
  }

  @Get('cash-flow-projection')
  cashFlowProjection(@CurrentUser() userId: string) {
    return this.analyticsService.cashFlowProjection(userId);
  }
}
