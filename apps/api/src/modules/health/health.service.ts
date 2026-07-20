import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { StorageAdapter } from '../../infrastructure/storage/storage.adapter';
import { APP_VERSION } from '../../shared/constants/app.constants';

interface HealthCheck {
  status: 'ok' | 'error' | 'degraded';
  latency: number;
  details?: Record<string, unknown>;
}

export interface HealthResult {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, HealthCheck>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly queueService: QueueService,
    @Optional() @Inject('StorageAdapter') private readonly storage?: StorageAdapter,
  ) {}

  async check(): Promise<HealthResult> {
    const checks: Record<string, HealthCheck> = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    try {
      checks.queue = await this.checkQueue();
    } catch {
      checks.queue = { status: 'degraded', latency: 0 };
    }

    if (this.storage) {
      try {
        checks.storage = await this.checkStorage();
      } catch {
        checks.storage = { status: 'error', latency: 0 };
      }
    }

    const statuses = Object.values(checks).map((c) => c.status);
    const overallStatus = statuses.includes('error')
      ? 'error'
      : statuses.includes('degraded')
        ? 'degraded'
        : 'ok';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: APP_VERSION,
      environment: process.env.NODE_ENV || 'development',
      checks,
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latency: Date.now() - start };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'error', latency: Date.now() - start };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const healthy = await this.cacheService.healthCheck();
      return { status: healthy ? 'ok' : 'error', latency: Date.now() - start };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return { status: 'error', latency: Date.now() - start };
    }
  }

  private async checkQueue(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const health = await this.queueService.getQueueHealth();
      const hasFailed = Object.values(health).some((q) => q.failed > 0);
      return {
        status: hasFailed ? 'degraded' : 'ok',
        latency: Date.now() - start,
        details: health,
      };
    } catch {
      return { status: 'error', latency: Date.now() - start };
    }
  }

  private async checkStorage(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const testKey = `__health_check_${Date.now()}`;
      const testData = Buffer.from('health-check');
      await this.storage!.put(testKey, testData);
      const retrieved = await this.storage!.get(testKey);
      await this.storage!.delete(testKey);

      const healthy = retrieved !== null && retrieved.equals(testData);
      return { status: healthy ? 'ok' : 'error', latency: Date.now() - start };
    } catch (error) {
      this.logger.error('Storage health check failed', error);
      return { status: 'error', latency: Date.now() - start };
    }
  }
}
