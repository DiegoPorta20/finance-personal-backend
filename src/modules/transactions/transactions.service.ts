import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { buildPaginatedResponse } from '../../common/dto/pagination.dto.js';

export interface TransactionFilters {
  type?: string;
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    filters?: TransactionFilters,
    page = 1,
    limit = 20,
  ) {
    const where: any = { userId };

    if (filters?.type) where.type = filters.type;
    if (filters?.accountId) where.accountId = filters.accountId;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }
    if (filters?.minAmount !== undefined || filters?.maxAmount !== undefined) {
      where.amount = {};
      if (filters.minAmount !== undefined) where.amount.gte = filters.minAmount;
      if (filters.maxAmount !== undefined) where.amount.lte = filters.maxAmount;
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true, account: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
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
