import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string, filters?: { type?: string; accountId?: string }) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.accountId && { accountId: filters.accountId }),
      },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true, account: true },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async create(userId: string, dto: CreateTransactionDto) {
    const balanceChange =
      dto.type === 'income' ? dto.amount : -dto.amount;

    const [transaction] = await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: {
          type: dto.type,
          amount: dto.amount,
          date: new Date(dto.date),
          note: dto.note,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          userId,
        },
        include: { category: true, account: true },
      }),
      this.prisma.account.update({
        where: { id: dto.accountId },
        data: { balance: { increment: balanceChange } },
      }),
    ]);

    return transaction;
  }

  async update(id: string, userId: string, dto: UpdateTransactionDto) {
    await this.findOne(id, userId);
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.date && { date: new Date(dto.date) }),
      },
      include: { category: true, account: true },
    });
  }

  async remove(id: string, userId: string) {
    const transaction = await this.findOne(id, userId);

    const balanceRevert =
      transaction.type === 'income' ? -transaction.amount : transaction.amount;

    await this.prisma.$transaction([
      this.prisma.transaction.delete({ where: { id } }),
      this.prisma.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: balanceRevert } },
      }),
    ]);

    return { deleted: true };
  }
}
