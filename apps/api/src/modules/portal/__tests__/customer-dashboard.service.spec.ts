import { Test, TestingModule } from '@nestjs/testing';
import { CustomerDashboardService } from '../customer-dashboard.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('CustomerDashboardService', () => {
  let service: CustomerDashboardService;

  const mockPrisma = {};

  const mockPrismaAny = {
    customerPortalUser: { findFirst: jest.fn() },
    ticket: { count: jest.fn(), findMany: jest.fn() },
    conversation: { count: jest.fn() },
    quote: { count: jest.fn() },
    contract: { count: jest.fn(), findMany: jest.fn() },
    notification: { count: jest.fn() },
    timeline: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerDashboardService,
        { provide: PrismaService, useValue: { ...mockPrisma, ...mockPrismaAny } },
      ],
    }).compile();

    service = module.get<CustomerDashboardService>(CustomerDashboardService);
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return dashboard data', async () => {
      mockPrismaAny.customerPortalUser.findFirst.mockResolvedValue({ customerId: 'cust-1' });
      mockPrismaAny.ticket.count.mockResolvedValue(3);
      mockPrismaAny.conversation.count.mockResolvedValue(2);
      mockPrismaAny.quote.count.mockResolvedValue(1);
      mockPrismaAny.contract.count.mockResolvedValue(1);
      mockPrismaAny.notification.count.mockResolvedValue(5);
      mockPrismaAny.ticket.findMany.mockResolvedValue([]);
      mockPrismaAny.contract.findMany.mockResolvedValue([]);
      mockPrismaAny.timeline.findMany.mockResolvedValue([]);

      const result = await service.getDashboard('tenant-1', 'pu-1');

      expect(result.stats.openTickets).toBe(3);
      expect(result.stats.activeConversations).toBe(2);
      expect(result.stats.unreadNotifications).toBe(5);
    });

    it('should handle missing customer id', async () => {
      mockPrismaAny.customerPortalUser.findFirst.mockResolvedValue({ customerId: null });
      mockPrismaAny.ticket.count.mockResolvedValue(0);
      mockPrismaAny.conversation.count.mockResolvedValue(0);
      mockPrismaAny.quote.count.mockResolvedValue(0);
      mockPrismaAny.contract.count.mockResolvedValue(0);
      mockPrismaAny.notification.count.mockResolvedValue(0);
      mockPrismaAny.ticket.findMany.mockResolvedValue([]);
      mockPrismaAny.contract.findMany.mockResolvedValue([]);
      mockPrismaAny.timeline.findMany.mockResolvedValue([]);

      const result = await service.getDashboard('tenant-1', 'pu-1');
      expect(result.stats.pendingQuotes).toBe(0);
    });
  });
});
