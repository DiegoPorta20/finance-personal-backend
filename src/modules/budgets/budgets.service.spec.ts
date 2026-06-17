import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BudgetsService } from './budgets.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IncomeSourcesService } from '../income-sources/income-sources.service.js';

const mockPrisma = {
  budget: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  transaction: {
    groupBy: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
  },
};

const mockIncomeSourcesService = {
  getMonthlyTotal: jest.fn(),
};

describe('BudgetsService', () => {
  let service: BudgetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IncomeSourcesService, useValue: mockIncomeSourcesService },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrisma.budget.findFirst.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStatus', () => {
    it('should return budget status with spending', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([
        {
          id: 'b1',
          categoryId: 'cat-food',
          amount: 75000,
          category: { name: 'Alimentacion', slug: 'food' },
        },
      ]);
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { categoryId: 'cat-food', _sum: { amount: 45000 } },
      ]);

      const result = await service.getStatus('user-1', 6, 2026);

      expect(result).toEqual([
        {
          budgetId: 'b1',
          categoryId: 'cat-food',
          categoryName: 'Alimentacion',
          categorySlug: 'food',
          budgetAmount: 75000,
          spentAmount: 45000,
          remaining: 30000,
          isOverBudget: false,
        },
      ]);
    });

    it('should detect over budget', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([
        {
          id: 'b1',
          categoryId: 'cat-food',
          amount: 30000,
          category: { name: 'Alimentacion', slug: 'food' },
        },
      ]);
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { categoryId: 'cat-food', _sum: { amount: 45000 } },
      ]);

      const result = await service.getStatus('user-1', 6, 2026);

      expect(result[0].isOverBudget).toBe(true);
      expect(result[0].remaining).toBe(-15000);
    });
  });

  describe('autoGenerate', () => {
    it('should return empty when no income', async () => {
      mockIncomeSourcesService.getMonthlyTotal.mockResolvedValue(0);

      const result = await service.autoGenerate('user-1');

      expect(result.monthlyIncome).toBe(0);
      expect(result.suggestions).toEqual([]);
    });

    it('should split 50/30/20 correctly', async () => {
      mockIncomeSourcesService.getMonthlyTotal.mockResolvedValue(1000000);
      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'c1', slug: 'food', name: 'Alimentacion' },
        { id: 'c2', slug: 'housing', name: 'Vivienda' },
        { id: 'c3', slug: 'entertainment', name: 'Entretenimiento' },
      ]);

      const result = await service.autoGenerate('user-1');

      expect(result.monthlyIncome).toBe(1000000);
      expect(result.savingsBudget).toBe(200000); // 20%
      // 2 essentials get 50% split: 250000 each
      const essentials = result.suggestions.filter(
        (s) => s.group === 'essentials',
      );
      expect(essentials).toHaveLength(2);
      expect(essentials[0].suggestedAmount).toBe(250000);
      // 1 lifestyle gets full 30%: 300000
      const lifestyle = result.suggestions.filter(
        (s) => s.group === 'lifestyle',
      );
      expect(lifestyle).toHaveLength(1);
      expect(lifestyle[0].suggestedAmount).toBe(300000);
    });
  });
});
