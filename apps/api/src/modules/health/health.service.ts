import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { APP_VERSION } from '../../shared/constants/app.constants';

interface HealthCheck {
  status: 'ok' | 'error' | 'degraded';
  latency: number;
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
      };
    } catch {
      return { status: 'error', latency: Date.now() - start };
    }
  }
}
