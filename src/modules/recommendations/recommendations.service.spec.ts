import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { IncomeSourcesService } from '../income-sources/income-sources.service.js';

const mockPrisma = {
  budget: { findMany: jest.fn() },
  transaction: {
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  },
  category: { findFirst: jest.fn(), findMany: jest.fn() },
  savingsGoal: { findMany: jest.fn() },
};

const mockNotifications = {
  createNotification: jest.fn(),
};

const mockIncomeSources = {
  getMonthlyTotal: jest.fn(),
};

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: IncomeSourcesService, useValue: mockIncomeSources },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    jest.clearAllMocks();
  });

  describe('getRecommendations - budget alerts', () => {
    it('should flag over-budget categories', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([{
        categoryId: 'cat-1',
        amount: 50000,
        category: { name: 'Alimentacion', slug: 'food' },
      }]);
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { amount: 60000 } },
      ]);
      mockIncomeSources.getMonthlyTotal.mockResolvedValue(0);
      mockPrisma.savingsGoal.findMany.mockResolvedValue([]);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

      const result = await service.getRecommendations('user-1');

      const budgetAlerts = result.filter((r) => r.type === 'budget_alert');
      expect(budgetAlerts).toHaveLength(1);
      expect(budgetAlerts[0].severity).toBe('high');
      expect(mockNotifications.createNotification).toHaveBeenCalled();
    });

    it('should warn when near budget limit (80%+)', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([{
        categoryId: 'cat-1',
        amount: 100000,
        category: { name: 'Alimentacion', slug: 'food' },
      }]);
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { amount: 85000 } },
      ]);
      mockIncomeSources.getMonthlyTotal.mockResolvedValue(0);
      mockPrisma.savingsGoal.findMany.mockResolvedValue([]);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

      const result = await service.getRecommendations('user-1');

      const warnings = result.filter(
        (r) => r.type === 'budget_alert' && r.severity === 'medium',
      );
      expect(warnings).toHaveLength(1);
    });
  });

  describe('getRecommendations - savings warning', () => {
    it('should warn when savings below 20%', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([]);
      mockPrisma.transaction.groupBy.mockResolvedValue([]);
      mockPrisma.savingsGoal.findMany.mockResolvedValue([]);
      mockIncomeSources.getMonthlyTotal.mockResolvedValue(500000);
      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 500000 } }) // income
        .mockResolvedValueOnce({ _sum: { amount: 450000 } }); // expense

      const result = await service.getRecommendations('user-1');

      const savingsWarnings = result.filter(
        (r) => r.type === 'savings_warning',
      );
      expect(savingsWarnings).toHaveLength(1);
    });

    it('should not warn when savings above 20%', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([]);
      mockPrisma.transaction.groupBy.mockResolvedValue([]);
      mockPrisma.savingsGoal.findMany.mockResolvedValue([]);
      mockIncomeSources.getMonthlyTotal.mockResolvedValue(500000);
      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 500000 } })
        .mockResolvedValueOnce({ _sum: { amount: 300000 } });

      const result = await service.getRecommendations('user-1');

      const savingsWarnings = result.filter(
        (r) => r.type === 'savings_warning',
      );
      expect(savingsWarnings).toHaveLength(0);
    });
  });

  describe('getRecommendations - goal deadlines', () => {
    it('should alert goals at risk with < 80% progress and near deadline', async () => {
      mockPrisma.budget.findMany.mockResolvedValue([]);
      mockPrisma.transaction.groupBy.mockResolvedValue([]);
      mockIncomeSources.getMonthlyTotal.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 15); // 15 days from now

      mockPrisma.savingsGoal.findMany.mockResolvedValue([{
        id: '1',
        name: 'Vacaciones',
        targetAmount: 300000,
        currentAmount: 100000, // 33%
        deadline,
      }]);

      const result = await service.getRecommendations('user-1');

      const goalAlerts = result.filter((r) => r.type === 'goal_at_risk');
      expect(goalAlerts).toHaveLength(1);
      expect(goalAlerts[0].severity).toBe('high'); // < 50%
      expect(mockNotifications.createNotification).toHaveBeenCalled();
    });
  });
});
