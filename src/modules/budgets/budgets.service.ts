import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateBudgetDto } from './dto/create-budget.dto.js';
import { UpdateBudgetDto } from './dto/update-budget.dto.js';
import { IncomeSourcesService } from '../income-sources/income-sources.service.js';

const ESSENTIAL_CATEGORIES = ['housing', 'food', 'transport', 'health', 'debts'];
const LIFESTYLE_CATEGORIES = ['entertainment', 'subscriptions', 'education', 'other_expense'];

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incomeSourcesService: IncomeSourcesService,
  ) {}

  findAll(userId: string, month?: number, year?: number) {
    return this.prisma.budget.findMany({
      where: {
        userId,
        ...(month !== undefined && { month }),
        ...(year !== undefined && { year }),
      },
      include: { category: true },
    });
  }

  async findOne(id: string, userId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: { category: true },
    });
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  create(userId: string, dto: CreateBudgetDto) {
    return this.prisma.budget.create({
      data: {
        amount: dto.amount,
        month: dto.month,
        year: dto.year,
        categoryId: dto.categoryId,
        userId,
      },
      include: { category: true },
    });
  }

  async update(id: string, userId: string, dto: UpdateBudgetDto) {
    await this.findOne(id, userId);
    return this.prisma.budget.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.budget.delete({ where: { id } });
  }

  async getStatus(userId: string, month: number, year: number) {
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
      return {
        budgetId: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        categorySlug: b.category.slug,
        budgetAmount: b.amount,
        spentAmount,
        remaining: b.amount - spentAmount,
        isOverBudget: spentAmount > b.amount,
      };
    });
  }

  async autoGenerate(userId: string) {
    const monthlyIncome =
      await this.incomeSourcesService.getMonthlyTotal(userId);

    if (monthlyIncome === 0) {
      return { monthlyIncome: 0, suggestions: [] };
    }

    const categories = await this.prisma.category.findMany({
      where: {
        type: 'expense',
        OR: [{ userId: null }, { userId }],
      },
    });

    const essentialBudget = Math.round(monthlyIncome * 0.5);
    const lifestyleBudget = Math.round(monthlyIncome * 0.3);
    const savingsBudget = Math.round(monthlyIncome * 0.2);

    const essentials = categories.filter((c) =>
      ESSENTIAL_CATEGORIES.includes(c.slug),
    );
    const lifestyle = categories.filter((c) =>
      LIFESTYLE_CATEGORIES.includes(c.slug),
    );

    const essentialPerCategory =
      essentials.length > 0 ? Math.round(essentialBudget / essentials.length) : 0;
    const lifestylePerCategory =
      lifestyle.length > 0 ? Math.round(lifestyleBudget / lifestyle.length) : 0;

    const suggestions = [
      ...essentials.map((c) => ({
        categoryId: c.id,
        categoryName: c.name,
        categorySlug: c.slug,
        group: 'essentials' as const,
        suggestedAmount: essentialPerCategory,
      })),
      ...lifestyle.map((c) => ({
        categoryId: c.id,
        categoryName: c.name,
        categorySlug: c.slug,
        group: 'lifestyle' as const,
        suggestedAmount: lifestylePerCategory,
      })),
    ];

    return {
      monthlyIncome,
      savingsBudget,
      suggestions,
    };
  }
}
