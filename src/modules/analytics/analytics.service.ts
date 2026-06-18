import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IncomeSourcesService } from '../income-sources/income-sources.service.js';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incomeSourcesService: IncomeSourcesService,
  ) {}

  async spendingByCategory(
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    const results = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'expense',
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      _sum: { amount: true },
    });

    const categoryIds = results.map((r) => r.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return results.map((r) => ({
      categoryId: r.categoryId,
      categoryName: categoryMap.get(r.categoryId)?.name ?? 'Unknown',
      categoryIcon: categoryMap.get(r.categoryId)?.icon ?? 'more_horiz',
      totalAmount: r._sum.amount ?? 0,
    }));
  }

  async incomeVsExpense(userId: string, months: number) {
    const ranges = this.getMonthRanges(months);

    const results = await Promise.all(
      ranges.map(async ({ month, year, start, end }) => {
        const [income, expense] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: {
              userId,
              type: 'income',
              date: { gte: start, lte: end },
            },
            _sum: { amount: true },
          }),
          this.prisma.transaction.aggregate({
            where: {
              userId,
              type: 'expense',
              date: { gte: start, lte: end },
            },
            _sum: { amount: true },
          }),
        ]);

        return {
          month,
          year,
          totalIncome: income._sum.amount ?? 0,
          totalExpense: expense._sum.amount ?? 0,
        };
      }),
    );

    return results;
  }

  async savingsTrend(userId: string, months: number) {
    const ranges = this.getMonthRanges(months);

    const results = await Promise.all(
      ranges.map(async ({ month, year, start, end }) => {
        const [income, expense] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: {
              userId,
              type: 'income',
              date: { gte: start, lte: end },
            },
            _sum: { amount: true },
          }),
          this.prisma.transaction.aggregate({
            where: {
              userId,
              type: 'expense',
              date: { gte: start, lte: end },
            },
            _sum: { amount: true },
          }),
        ]);

        return {
          month,
          year,
          savedAmount:
            (income._sum.amount ?? 0) - (expense._sum.amount ?? 0),
        };
      }),
    );

    return results;
  }

  async budgetStatus(userId: string, month: number, year: number) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
    });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const spending = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'expense',
        date: { gte: startDate, lte: endDate },
        categoryId: { in: budgets.map((b) => b.categoryId) },
      },
      _sum: { amount: true },
    });

    const spendingMap = new Map(
      spending.map((s) => [s.categoryId, s._sum.amount ?? 0]),
    );

    return budgets.map((b) => {
      const spentAmount = spendingMap.get(b.categoryId) ?? 0;
      const usagePercent =
        b.amount > 0 ? Math.round((spentAmount / b.amount) * 100) : 0;

      return {
        categoryId: b.categoryId,
        categoryName: b.category.name,
        categorySlug: b.category.slug,
        categoryIcon: b.category.icon,
        budgetAmount: b.amount,
        spentAmount,
        remaining: b.amount - spentAmount,
        usagePercent,
        isOverBudget: spentAmount > b.amount,
      };
    });
  }

  async cashFlowProjection(userId: string) {
    const sources = await this.prisma.incomeSource.findMany({
      where: { userId },
      include: { account: true },
    });

    const now = new Date();
    const projections = [];

    for (let i = 0; i < 3; i++) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const month = targetMonth.getMonth() + 1;
      const year = targetMonth.getFullYear();

      let projectedIncome = 0;
      for (const source of sources) {
        switch (source.periodicity) {
          case 'weekly':
            projectedIncome += source.amount * 4;
            break;
          case 'biweekly':
            projectedIncome += source.amount * 2;
            break;
          case 'monthly':
            projectedIncome += source.amount;
            break;
        }
      }

      projections.push({ month, year, projectedIncome });
    }

    return projections;
  }

  private getMonthRanges(months: number) {
    const now = new Date();
    const ranges = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      ranges.push({ month, year, start, end });
    }

    return ranges;
  }
}
