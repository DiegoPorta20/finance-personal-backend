import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateIncomeSourceDto } from './dto/create-income-source.dto.js';
import { UpdateIncomeSourceDto } from './dto/update-income-source.dto.js';

@Injectable()
export class IncomeSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.incomeSource.findMany({
      where: { userId },
      include: { account: true },
    });
  }

  async findOne(id: string, userId: string) {
    const source = await this.prisma.incomeSource.findFirst({
      where: { id, userId },
      include: { account: true },
    });
    if (!source) throw new NotFoundException('Income source not found');
    return source;
  }

  async create(userId: string, dto: CreateIncomeSourceDto) {
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId },
    });
    if (!account) {
      throw new BadRequestException('Account not found or not owned by user');
    }

    return this.prisma.incomeSource.create({
      data: {
        name: dto.name,
        type: dto.type,
        amount: dto.amount,
        periodicity: dto.periodicity,
        nextDate: new Date(dto.nextDate),
        accountId: dto.accountId,
        userId,
      },
      include: { account: true },
    });
  }

  async update(id: string, userId: string, dto: UpdateIncomeSourceDto) {
    await this.findOne(id, userId);

    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, userId },
      });
      if (!account) {
        throw new BadRequestException('Account not found or not owned by user');
      }
    }

    return this.prisma.incomeSource.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.nextDate && { nextDate: new Date(dto.nextDate) }),
      },
      include: { account: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.incomeSource.delete({ where: { id } });
  }

  async getMonthlyTotal(userId: string): Promise<number> {
    const sources = await this.prisma.incomeSource.findMany({
      where: { userId },
    });

    return sources.reduce((total, source) => {
      switch (source.periodicity) {
        case 'weekly':
          return total + source.amount * 4;
        case 'biweekly':
          return total + source.amount * 2;
        case 'monthly':
          return total + source.amount;
        default:
          return total + source.amount;
      }
    }, 0);
  }
}
