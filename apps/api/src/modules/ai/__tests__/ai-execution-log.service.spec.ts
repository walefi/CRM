import { Test, TestingModule } from '@nestjs/testing';
import { AiExecutionLogService } from '../ai-execution-log.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AiExecutionLogService', () => {
  let service: AiExecutionLogService;

  const mockPrisma = {
    aiExecutionLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiExecutionLogService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AiExecutionLogService>(AiExecutionLogService);
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create an execution log', async () => {
      mockPrisma.aiExecutionLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.log({
        action: 'lead_scoring',
        entityType: 'lead',
        entityId: 'lead-1',
        durationMs: 100,
        success: true,
        tenantId: 'tenant-1',
      });

      expect(result.id).toBe('log-1');
      expect(mockPrisma.aiExecutionLog.create).toHaveBeenCalled();
    });
  });

  describe('getLogs', () => {
    it('should return paginated logs', async () => {
      mockPrisma.aiExecutionLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'lead_scoring' },
      ]);
      mockPrisma.aiExecutionLog.count.mockResolvedValue(1);

      const result = await service.getLogs('tenant-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return execution stats', async () => {
      mockPrisma.aiExecutionLog.aggregate.mockResolvedValue({
        _count: 10,
        _sum: { tokens: 1000, cost: 0.5, durationMs: 5000 },
        _avg: { durationMs: 500 },
      });
      mockPrisma.aiExecutionLog.groupBy.mockResolvedValue([
        { action: 'lead_scoring', _count: 5, _sum: { tokens: 500, cost: 0.25 } },
      ]);

      const result = await service.getStats('tenant-1');

      expect(result.totalExecutions).toBe(10);
      expect(result.totalTokens).toBe(1000);
      expect(result.byAction).toHaveLength(1);
    });
  });
});
