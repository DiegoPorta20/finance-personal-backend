import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto.js';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto.js';

@Injectable()
export class SavingsGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, userId },
    });
    if (!goal) throw new NotFoundException('Savings goal not found');
    return goal;
  }

  create(userId: string, dto: CreateSavingsGoalDto) {
    return this.prisma.savingsGoal.create({
      data: {
        name: dto.name,
        targetAmount: dto.targetAmount,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        userId,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateSavingsGoalDto) {
    await this.findOne(id, userId);
    return this.prisma.savingsGoal.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.deadline !== undefined && {
          deadline: dto.deadline ? new Date(dto.deadline) : null,
        }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.savingsGoal.delete({ where: { id } });
  }

  async addFunds(
    id: string,
    userId: string,
    amount: number,
    accountId?: string,
  ) {
    const goal = await this.findOne(id, userId);

    // Si se indica una cuenta, el abono se descuenta de su balance (atómico).
    if (accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: accountId, userId },
      });
      if (!account) {
        throw new BadRequestException('Account not found or not owned by user');
      }
    }

    const ops: any[] = [
      this.prisma.savingsGoal.update({
        where: { id },
        data: { currentAmount: { increment: amount } },
      }),
    ];
    if (accountId) {
      ops.push(
        this.prisma.account.update({
          where: { id: accountId },
          data: { balance: { decrement: amount } },
        }),
      );
    }
    const [updated] = await this.prisma.$transaction(ops);

    if (
      goal.currentAmount < goal.targetAmount &&
      updated.currentAmount >= updated.targetAmount
    ) {
      await this.prisma.notification.create({
        data: {
          title: 'Meta alcanzada',
          message: `Felicidades, alcanzaste tu meta: ${goal.name}`,
          type: 'goal_progress',
          userId,
        },
      });
    }

    return updated;
  }
}
