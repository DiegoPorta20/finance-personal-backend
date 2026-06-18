import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { IncomeSourcesService } from '../income-sources/income-sources.service.js';

export interface Recommendation {
  type: 'budget_alert' | 'savings_warning' | 'goal_at_risk' | 'tip';
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  categoryId?: string;
}

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly incomeSourcesService: IncomeSourcesService,
  ) {}

  async getRecommendations(userId: string): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    const [budgetAlerts, savingsWarning, goalAlerts] = await Promise.all([
      this.checkBudgetAlerts(userId),
      this.checkSavingsWarning(userId),
      this.checkGoalDeadlines(userId),
    ]);

    recommendations.push(...budgetAlerts, ...savingsWarning, ...goalAlerts);

    return recommendations;
  }

  private async checkBudgetAlerts(userId: string): Promise<Recommendation[]> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const budgets = await this.prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
    });

    if (budgets.length === 0) return [];

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

    const alerts: Recommendation[] = [];

    for (const budget of budgets) {
      const spent = spendingMap.get(budget.categoryId) ?? 0;
      const percent = budget.amount > 0 ? spent / budget.amount : 0;

      if (percent > 1) {
        const alert: Recommendation = {
          type: 'budget_alert',
          severity: 'high',
          title: `Presupuesto excedido: ${budget.category.name}`,
          message: `Has gastado ${Math.round(percent * 100)}% de tu presupuesto en ${budget.category.name}.`,
          categoryId: budget.categoryId,
        };
        alerts.push(alert);

        await this.notificationsService.createNotification(
          userId,
          alert.title,
          alert.message,
          'budget_alert',
        );
      } else if (percent >= 0.8) {
        alerts.push({
          type: 'budget_alert',
          severity: 'medium',
          title: `Cerca del limite: ${budget.category.name}`,
          message: `Has usado ${Math.round(percent * 100)}% de tu presupuesto en ${budget.category.name}.`,
          categoryId: budget.categoryId,
        });
      }
    }

    return alerts;
  }

  private async checkSavingsWarning(userId: string): Promise<Recommendation[]> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const monthlyIncome =
      await this.incomeSourcesService.getMonthlyTotal(userId);

    if (monthlyIncome === 0) return [];

    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'income', date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'expense', date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
    ]);

    const actualIncome = incomeAgg._sum.amount ?? 0;
    const actualExpense = expenseAgg._sum.amount ?? 0;
    const projected = actualIncome > 0 ? actualIncome : monthlyIncome;
    const savingsTarget = Math.round(projected * 0.2);
    const currentSavings = projected - actualExpense;

    if (currentSavings < savingsTarget) {
      const topSpending = await this.getTopDeviatingCategory(
        userId,
        startDate,
        endDate,
      );

      const suggestion = topSpending
        ? ` Considera reducir gastos en ${topSpending}.`
        : '';

      return [{
        type: 'savings_warning',
        severity: 'medium',
        title: 'Ahorro por debajo del objetivo',
        message: `Tu ahorro proyectado este mes esta por debajo del 20% de tus ingresos.${suggestion}`,
      }];
    }

    return [];
  }

  private async getTopDeviatingCategory(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<string | null> {
    const threeMonthsAgo = new Date(startDate);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [currentSpending, historicalSpending] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'expense',
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'expense',
          date: { gte: threeMonthsAgo, lt: startDate },
        },
        _sum: { amount: true },
      }),
    ]);

    const historicalAvg = new Map(
      historicalSpending.map((h) => [
        h.categoryId,
        Math.round((h._sum.amount ?? 0) / 3),
      ]),
    );

    let maxDeviation = 0;
    let maxCategoryId: string | null = null;

    for (const current of currentSpending) {
      const avg = historicalAvg.get(current.categoryId) ?? 0;
      const currentAmount = current._sum.amount ?? 0;
      const deviation = avg > 0 ? currentAmount - avg : 0;

      if (deviation > maxDeviation) {
        maxDeviation = deviation;
        maxCategoryId = current.categoryId;
      }
    }

    if (!maxCategoryId) return null;

    const category = await this.prisma.category.findFirst({
      where: { id: maxCategoryId },
    });

    return category?.name ?? null;
  }

  private async checkGoalDeadlines(userId: string): Promise<Recommendation[]> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const goals = await this.prisma.savingsGoal.findMany({
      where: {
        userId,
        deadline: { lte: thirtyDaysFromNow, gte: new Date() },
      },
    });

    const alerts: Recommendation[] = [];

    for (const goal of goals) {
      const progress =
        goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;

      if (progress < 0.8) {
        const alert: Recommendation = {
          type: 'goal_at_risk',
          severity: progress < 0.5 ? 'high' : 'medium',
          title: `Meta en riesgo: ${goal.name}`,
          message: `Tu meta "${goal.name}" vence en menos de 30 dias y solo llevas ${Math.round(progress * 100)}%.`,
        };
        alerts.push(alert);

        await this.notificationsService.createNotification(
          userId,
          alert.title,
          alert.message,
          'goal_progress',
        );
      }
    }

    return alerts;
  }
}
