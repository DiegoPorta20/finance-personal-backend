import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      const notifications = [
        { id: '2', title: 'New', createdAt: new Date() },
        { id: '1', title: 'Old', createdAt: new Date() },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(notifications);
      mockPrisma.notification.count.mockResolvedValue(2);

      const result = await service.findAll('user-1');
      expect(result.data).toEqual(notifications);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      await expect(service.markAsRead('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should mark notification as read', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.notification.update.mockResolvedValue({
        id: '1',
        read: true,
      });

      const result = await service.markAsRead('1', 'user-1');
      expect(result.read).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should return updated count', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-1');
      expect(result).toEqual({ updated: 3 });
    });
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const created = {
        id: '1',
        title: 'Alert',
        message: 'Over budget',
        type: 'budget_alert',
      };
      mockPrisma.notification.create.mockResolvedValue(created);

      const result = await service.createNotification(
        'user-1',
        'Alert',
        'Over budget',
        'budget_alert',
      );
      expect(result).toEqual(created);
    });
  });
});
