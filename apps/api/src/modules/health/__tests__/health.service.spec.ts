import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../health.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { StorageAdapter } from '../../../infrastructure/storage/storage.adapter';

describe('HealthService', () => {
  let service: HealthService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
  };

  const mockCache = {
    healthCheck: jest.fn(),
  };

  const mockQueue = {
    getQueueHealth: jest.fn(),
  };

  const mockStorage = {
    put: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
        { provide: QueueService, useValue: mockQueue },
        { provide: 'StorageAdapter', useValue: mockStorage },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return ok when all checks pass', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockCache.healthCheck.mockResolvedValue(true);
      mockQueue.getQueueHealth.mockResolvedValue({ 'email-imap-poll': { active: 0, completed: 10, failed: 0 } });
      mockStorage.put.mockResolvedValue({ key: 'k', provider: 'local', size: 1 });
      mockStorage.get.mockResolvedValue(Buffer.from('health-check'));
      mockStorage.delete.mockResolvedValue(undefined);

      const result = await service.check();

      expect(result.status).toBe('ok');
      expect(result.checks.database.status).toBe('ok');
      expect(result.checks.redis.status).toBe('ok');
      expect(result.checks.queue.status).toBe('ok');
      expect(result.checks.storage.status).toBe('ok');
    });

    it('should return error when database fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
      mockCache.healthCheck.mockResolvedValue(true);

      const result = await service.check();

      expect(result.status).toBe('error');
      expect(result.checks.database.status).toBe('error');
    });

    it('should return degraded when queue has failed jobs', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockCache.healthCheck.mockResolvedValue(true);
      mockQueue.getQueueHealth.mockResolvedValue({ 'email-send': { active: 0, completed: 5, failed: 3 } });

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.checks.queue.status).toBe('degraded');
    });

    it('should return ok when storage check passes', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockCache.healthCheck.mockResolvedValue(true);
      mockQueue.getQueueHealth.mockResolvedValue({});
      mockStorage.put.mockResolvedValue({ key: 'k', provider: 'local', size: 12 });
      mockStorage.get.mockResolvedValue(Buffer.from('health-check'));
      mockStorage.delete.mockResolvedValue(undefined);

      const result = await service.check();

      expect(result.checks.storage).toBeDefined();
      expect(result.checks.storage.status).toBe('ok');
    });

    it('should return error when storage check fails', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockCache.healthCheck.mockResolvedValue(true);
      mockQueue.getQueueHealth.mockResolvedValue({});
      mockStorage.put.mockRejectedValue(new Error('disk full'));

      const result = await service.check();

      expect(result.checks.storage.status).toBe('error');
    });

    it('should include version and uptime', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockCache.healthCheck.mockResolvedValue(true);
      mockQueue.getQueueHealth.mockResolvedValue({});

      const result = await service.check();

      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });
  });
});
