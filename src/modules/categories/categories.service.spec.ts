import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockPrisma = {
  category: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return system and user categories', async () => {
      const categories = [
        { id: '1', slug: 'food', name: 'Alimentacion', userId: null },
        { id: '2', slug: 'custom', name: 'Custom', userId: 'user-1' },
      ];
      mockPrisma.category.findMany.mockResolvedValue(categories);

      const result = await service.findAll('user-1');

      expect(result).toEqual(categories);
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { OR: [{ userId: null }, { userId: 'user-1' }] },
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a user category', async () => {
      const dto = { slug: 'custom', name: 'Custom', type: 'expense' };
      const created = { id: '1', ...dto, icon: 'more_horiz', userId: 'user-1' };
      mockPrisma.category.create.mockResolvedValue(created);

      const result = await service.create('user-1', dto);

      expect(result).toEqual(created);
    });
  });

  describe('remove', () => {
    it('should throw if category not owned by user', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(service.remove('cat-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
