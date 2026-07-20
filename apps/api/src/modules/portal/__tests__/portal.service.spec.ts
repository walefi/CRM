import { Test, TestingModule } from '@nestjs/testing';
import { PortalService } from '../portal.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('PortalService', () => {
  let service: PortalService;

  const mockPrisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    notification: { findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
    ticket: { findMany: jest.fn(), count: jest.fn() },
    contract: { findMany: jest.fn(), count: jest.fn() },
    quote: { findMany: jest.fn(), count: jest.fn() },
    conversation: { findMany: jest.fn(), count: jest.fn() },
  };

  const mockPrismaAny = {
    customerPortalUser: { findFirst: jest.fn(), update: jest.fn() },
    ticket: mockPrisma.ticket,
    contract: mockPrisma.contract,
    quote: mockPrisma.quote,
    conversation: mockPrisma.conversation,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalService,
        { provide: PrismaService, useValue: { ...mockPrisma, ...mockPrismaAny } },
      ],
    }).compile();

    service = module.get<PortalService>(PortalService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return portal user profile', async () => {
      mockPrismaAny.customerPortalUser.findFirst.mockResolvedValue({
        id: 'pu-1',
        email: 'client@test.com',
        firstName: 'João',
        lastName: 'Silva',
      });

      const result = await service.getProfile('tenant-1', 'pu-1');
      expect(result.email).toBe('client@test.com');
    });

    it('should fallback to internal user', async () => {
      mockPrismaAny.customerPortalUser.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        firstName: 'Maria',
      });

      const result = await service.getProfile('tenant-1', 'user-1');
      expect(result.email).toBe('user@test.com');
    });
  });

  describe('getPortalTickets', () => {
    it('should return paginated tickets', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([{ id: 't1', subject: 'Test' }]);
      mockPrisma.ticket.count.mockResolvedValue(1);

      const result = await service.getPortalTickets('tenant-1', 1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getPortalConversations', () => {
    it('should return paginated conversations', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([{ id: 'c1', subject: 'Chat' }]);
      mockPrisma.conversation.count.mockResolvedValue(1);

      const result = await service.getPortalConversations('tenant-1', 1, 10);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ id: 'n1', title: 'Test' }]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.getNotifications('tenant-1', 'user-1', 1, 10);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('markNotificationRead', () => {
    it('should mark notification as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markNotificationRead('tenant-1', 'user-1', 'n1');
      expect(result.count).toBe(1);
    });
  });
});
