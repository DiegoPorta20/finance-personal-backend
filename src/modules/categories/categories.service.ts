import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
    });
  }

  async findOne(id: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, OR: [{ userId: null }, { userId }] },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        icon: dto.icon ?? 'more_horiz',
        type: dto.type,
        userId,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) throw new NotFoundException('Category not found or not editable');
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) throw new NotFoundException('Category not found or not deletable');
    return this.prisma.category.delete({ where: { id } });
  }
}
