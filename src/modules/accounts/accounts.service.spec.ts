import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockPrisma = {
  account: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('AccountsService', () => {
  let service: AccountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return accounts for the user', async () => {
      const accounts = [{ id: '1', name: 'Bank', userId: 'user-1' }];
      mockPrisma.account.findMany.mockResolvedValue(accounts);

      const result = await service.findAll('user-1');

      expect(result).toEqual(accounts);
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create an account with default currency', async () => {
      const dto = { name: 'Cash', type: 'cash' as const };
      const created = { id: '1', ...dto, currency: 'USD', balance: 0, userId: 'user-1' };
      mockPrisma.account.create.mockResolvedValue(created);

      const result = await service.create('user-1', dto);

      expect(result).toEqual(created);
      expect(mockPrisma.account.create).toHaveBeenCalledWith({
        data: { name: 'Cash', type: 'cash', currency: 'USD', userId: 'user-1' },
      });
    });
  });

  describe('remove', () => {
    it('should delete the account', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: '1', userId: 'user-1' });
      mockPrisma.account.delete.mockResolvedValue({ id: '1' });

      const result = await service.remove('1', 'user-1');

      expect(result).toEqual({ id: '1' });
    });
  });
});
