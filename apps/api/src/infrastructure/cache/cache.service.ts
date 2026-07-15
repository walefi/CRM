import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;
  private readonly defaultTtl: number;
  private readonly defaultPrefix: string = 'crm';

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');
    this.defaultTtl = this.configService.get<number>('REDIS_DEFAULT_TTL', 3600);

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      retryStrategy: (times) => {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      lazyConnect: false,
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
    this.client.on('ready', () => this.logger.log('Redis ready'));
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis disconnected');
  }

  private buildKey(namespace: string, key: string): string {
    return `${this.defaultPrefix}:${namespace}:${key}`;
  }

  async get<T = unknown>(namespace: string, key: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(namespace, key);
      const value = await this.client.get(fullKey);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Cache GET failed: ${namespace}:${key}`, error);
      return null;
    }
  }

  async set<T = unknown>(
    namespace: string,
    key: string,
    value: T,
    ttl?: number,
  ): Promise<void> {
    try {
      const fullKey = this.buildKey(namespace, key);
      const serialized = JSON.stringify(value);
      const expiresIn = ttl || this.defaultTtl;
      await this.client.setex(fullKey, expiresIn, serialized);
    } catch (error) {
      this.logger.error(`Cache SET failed: ${namespace}:${key}`, error);
    }
  }

  async del(namespace: string, key: string): Promise<void> {
    try {
      const fullKey = this.buildKey(namespace, key);
      await this.client.del(fullKey);
    } catch (error) {
      this.logger.error(`Cache DEL failed: ${namespace}:${key}`, error);
    }
  }

  async exists(namespace: string, key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(namespace, key);
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch {
      return false;
    }
  }

  async ttl(namespace: string, key: string): Promise<number> {
    try {
      const fullKey = this.buildKey(namespace, key);
      return await this.client.ttl(fullKey);
    } catch {
      return -2;
    }
  }

  async invalidatePattern(namespace: string, pattern: string): Promise<void> {
    try {
      const fullPattern = this.buildKey(namespace, pattern);
      let cursor = '0';
      do {
        const result = await this.client.scan(cursor, 'MATCH', `${fullPattern}*`, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.error(`Cache invalidatePattern failed: ${namespace}:${pattern}`, error);
    }
  }

  async getOrSet<T>(
    namespace: string,
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(namespace, key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(namespace, key, value, ttl);
    return value;
  }

  getClient(): Redis {
    return this.client;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
