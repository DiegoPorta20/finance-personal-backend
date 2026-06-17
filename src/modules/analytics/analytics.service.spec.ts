import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockPrisma = {
  transaction: {
    groupBy: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
  },
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  describe('spendingByCategory', () => {
    it('should return grouped spending with category names', async () => {
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { amount: 15000 } },
        { categoryId: 'cat-2', _sum: { amount: 8000 } },
      ]);
      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Alimentacion', icon: 'restaurant' },
        { id: 'cat-2', name: 'Transporte', icon: 'directions_car' },
      ]);

      const result = await service.spendingByCategory(
        'user-1',
        '2026-01-01',
        '2026-01-31',
      );

      expect(result).toEqual([
        {
          categoryId: 'cat-1',
          categoryName: 'Alimentacion',
          categoryIcon: 'restaurant',
          totalAmount: 15000,
        },
        {
          categoryId: 'cat-2',
          categoryName: 'Transporte',
          categoryIcon: 'directions_car',
          totalAmount: 8000,
        },
      ]);
    });

    it('should return empty array when no transactions', async () => {
      mockPrisma.transaction.groupBy.mockResolvedValue([]);
      mockPrisma.category.findMany.mockResolvedValue([]);

      const result = await service.spendingByCategory(
        'user-1',
        '2026-01-01',
        '2026-01-31',
      );

      expect(result).toEqual([]);
    });
  });
});
