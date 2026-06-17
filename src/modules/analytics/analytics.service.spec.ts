import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IncomeSourcesService } from '../income-sources/income-sources.service.js';

const mockPrisma = {
  transaction: {
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
  },
  budget: {
    findMany: jest.fn(),
  },
  incomeSource: {
    findMany: jest.fn(),
  },
};

const mockIncomeSourcesService = {
  getMonthlyTotal: jest.fn(),
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IncomeSourcesService, useValue: mockIncomeSourcesService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  describe('spendingByCategory', () => {
    it('should return grouped spending with category names', async () => {
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { amount: 15000 } },
      ]);
      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Alimentacion', icon: 'restaurant' },
      ]);

      const result = await service.spendingByCategory(
        'user-1', '2026-01-01', '2026-01-31',
      );

      expect(result).toEqual([{
        categoryId: 'cat-1',
        categoryName: 'Alimentacion',
        categoryIcon: 'restaurant',
        totalAmount: 15000,
      }]);
    });
  });

  describe('incomeVsExpense', () => {
    it('should return monthly income and expense for N months', async () => {
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 500000 },
      });

      const result = await service.incomeVsExpense('user-1', 2);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('month');
      expect(result[0]).toHaveProperty('year');
      expect(result[0]).toHaveProperty('totalIncome');
      expect(result[0]).toHaveProperty('totalExpense');
    });
  });

  describe('savingsTrend', () => {
    it('should return savings per month', async () => {
      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 500000 } })
        .mockResolvedValueOnce({ _sum: { amount: 380000 } });

      const result = await service.savingsTrend('user-1', 1);

      expect(result).toHaveLength(1);
      expect(result[0].savedAmount).toBe(120000);
    });
  });

  describe('budgetStatus', () => {
    it('should return budget status with usage percent', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([{
        id: 'b1',
        categoryId: 'cat-1',
        amount: 100000,
        category: { name: 'Alimentacion', slug: 'food', icon: 'restaurant' },
      }]);
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { amount: 75000 } },
      ]);

      const result = await service.budgetStatus('user-1', 6, 2026);

      expect(result[0]).toEqual({
        categoryId: 'cat-1',
        categoryName: 'Alimentacion',
        categorySlug: 'food',
        categoryIcon: 'restaurant',
        budgetAmount: 100000,
        spentAmount: 75000,
        remaining: 25000,
        usagePercent: 75,
        isOverBudget: false,
      });
    });
  });

  describe('cashFlowProjection', () => {
    it('should project 3 months of income', async () => {
      mockPrisma.incomeSource.findMany.mockResolvedValue([
        { amount: 500000, periodicity: 'monthly', account: {} },
        { amount: 50000, periodicity: 'weekly', account: {} },
      ]);

      const result = await service.cashFlowProjection('user-1');

      expect(result).toHaveLength(3);
      // 500000 + 50000*4 = 700000 per month
      expect(result[0].projectedIncome).toBe(700000);
      expect(result[1].projectedIncome).toBe(700000);
    });
  });
});
