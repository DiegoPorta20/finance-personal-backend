import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SavingsGoalsService } from './savings-goals.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockPrisma = {
  savingsGoal: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
};

describe('SavingsGoalsService', () => {
  let service: SavingsGoalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavingsGoalsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SavingsGoalsService>(SavingsGoalsService);
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrisma.savingsGoal.findFirst.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a savings goal', async () => {
      const created = { id: '1', name: 'Vacaciones', targetAmount: 300000 };
      mockPrisma.savingsGoal.create.mockResolvedValue(created);

      const result = await service.create('user-1', {
        name: 'Vacaciones',
        targetAmount: 300000,
      });

      expect(result).toEqual(created);
    });
  });

  describe('addFunds', () => {
    it('should increment currentAmount', async () => {
      mockPrisma.savingsGoal.findFirst.mockResolvedValue({
        id: '1',
        name: 'Vacaciones',
        targetAmount: 300000,
        currentAmount: 100000,
      });
      mockPrisma.savingsGoal.update.mockResolvedValue({
        id: '1',
        currentAmount: 150000,
        targetAmount: 300000,
      });

      const result = await service.addFunds('1', 'user-1', 50000);

      expect(result.currentAmount).toBe(150000);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should create notification when goal is reached', async () => {
      mockPrisma.savingsGoal.findFirst.mockResolvedValue({
        id: '1',
        name: 'Vacaciones',
        targetAmount: 300000,
        currentAmount: 280000,
      });
      mockPrisma.savingsGoal.update.mockResolvedValue({
        id: '1',
        currentAmount: 300000,
        targetAmount: 300000,
      });

      await service.addFunds('1', 'user-1', 20000);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          title: 'Meta alcanzada',
          message: 'Felicidades, alcanzaste tu meta: Vacaciones',
          type: 'goal_progress',
          userId: 'user-1',
        },
      });
    });
  });
});
