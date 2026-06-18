import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockPrisma = {
  transaction: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  account: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated transactions', async () => {
      const transactions = [{ id: '1', type: 'expense', userId: 'user-1' }];
      mockPrisma.transaction.findMany.mockResolvedValue(transactions);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const result = await service.findAll('user-1');

      expect(result.data).toEqual(transactions);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by type', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await service.findAll('user-1', { type: 'income' });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'income' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await service.findAll('user-1', {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-01-31'),
            },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a transaction and update balance', async () => {
      const dto = {
        type: 'expense',
        amount: 5000,
        date: '2026-01-15',
        accountId: 'acc-1',
        categoryId: 'cat-1',
      };
      const created = { id: '1', ...dto, userId: 'user-1' };
      mockPrisma.$transaction.mockResolvedValue([created, {}]);

      const result = await service.create('user-1', dto);

      expect(result).toEqual(created);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete and revert balance', async () => {
      const transaction = {
        id: '1',
        type: 'expense',
        amount: 3000,
        accountId: 'acc-1',
        userId: 'user-1',
      };
      mockPrisma.transaction.findFirst.mockResolvedValue(transaction);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.remove('1', 'user-1');

      expect(result).toEqual({ deleted: true });
    });
  });
});
