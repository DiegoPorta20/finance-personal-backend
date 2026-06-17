import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
