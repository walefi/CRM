import { Test, TestingModule } from '@nestjs/testing';
import { PortalAccessLogService } from '../portal-access-log.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('PortalAccessLogService', () => {
  let service: PortalAccessLogService;

  const mockPrisma = {
    customerPortalAccessLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PortalAccessLogService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PortalAccessLogService>(PortalAccessLogService);
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create an access log', async () => {
      mockPrisma.customerPortalAccessLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.log({
        userId: 'user-1',
        action: 'login',
        resource: 'auth',
        tenantId: 'tenant-1',
      });

      expect(result.id).toBe('log-1');
    });
  });

  describe('getLogs', () => {
    it('should return paginated logs', async () => {
      mockPrisma.customerPortalAccessLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'login' },
      ]);
      mockPrisma.customerPortalAccessLog.count.mockResolvedValue(1);

      const result = await service.getLogs('tenant-1', 'user-1', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return access log stats', async () => {
      mockPrisma.customerPortalAccessLog.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3);
      mockPrisma.customerPortalAccessLog.groupBy.mockResolvedValue([
        { action: 'login', _count: 5 },
      ]);

      const result = await service.getStats('tenant-1', 'user-1');
      expect(result.totalLogs).toBe(10);
      expect(result.todayLogs).toBe(3);
    });
  });
});
