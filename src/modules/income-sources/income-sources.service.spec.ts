import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IncomeSourcesService } from './income-sources.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockPrisma = {
  incomeSource: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  account: {
    findFirst: jest.fn(),
  },
};

describe('IncomeSourcesService', () => {
  let service: IncomeSourcesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomeSourcesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<IncomeSourcesService>(IncomeSourcesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return income sources for the user', async () => {
      const sources = [{ id: '1', name: 'Salary', userId: 'user-1' }];
      mockPrisma.incomeSource.findMany.mockResolvedValue(sources);

      const result = await service.findAll('user-1');
      expect(result).toEqual(sources);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrisma.incomeSource.findFirst.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should throw if account not owned by user', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          name: 'Salary',
          type: 'salary',
          amount: 500000,
          periodicity: 'monthly',
          nextDate: '2026-07-01',
          accountId: 'bad-acc',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create when account is valid', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: 'acc-1' });
      const created = { id: '1', name: 'Salary', userId: 'user-1' };
      mockPrisma.incomeSource.create.mockResolvedValue(created);

      const result = await service.create('user-1', {
        name: 'Salary',
        type: 'salary',
        amount: 500000,
        periodicity: 'monthly',
        nextDate: '2026-07-01',
        accountId: 'acc-1',
      });

      expect(result).toEqual(created);
    });
  });

  describe('getMonthlyTotal', () => {
    it('should calculate monthly equivalent correctly', async () => {
      mockPrisma.incomeSource.findMany.mockResolvedValue([
        { amount: 500000, periodicity: 'monthly' },
        { amount: 100000, periodicity: 'biweekly' },
        { amount: 50000, periodicity: 'weekly' },
      ]);

      const result = await service.getMonthlyTotal('user-1');
      // 500000 + 100000*2 + 50000*4 = 900000
      expect(result).toBe(900000);
    });
  });
});
