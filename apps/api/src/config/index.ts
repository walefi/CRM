import { defineConfig } from './config.factory';

export const appConfig = defineConfig(() => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '3001', 10),
  url: process.env.API_URL || 'http://localhost:3001',
  version: '1.0.0',
  name: 'CRM Enterprise',
}));

export const databaseConfig = defineConfig(() => ({
  url: process.env.DATABASE_URL || '',
  logLevel: (process.env.DB_LOG_LEVEL?.split(',') || ['warn', 'error']) as string[],
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '13', 10),
}));

export const redisConfig = defineConfig(() => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  ttl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
}));

export const jwtConfig = defineConfig(() => ({
  secret: process.env.JWT_SECRET || 'default-secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
  expiration: process.env.JWT_EXPIRATION || '15m',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));

export const bullConfig = defineConfig(() => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  prefix: process.env.BULL_QUEUE_PREFIX || 'crm',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
}));

export const securityConfig = defineConfig(() => ({
  encryptionKey: process.env.ENCRYPTION_KEY || '32-char-encryption-key-here!!',
  rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));

export const serverConfig = defineConfig(() => ({
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
  compressionThreshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024', 10),
  maxPayloadSize: process.env.MAX_PAYLOAD_SIZE || '10mb',
}));

export type AppConfigType = ReturnType<typeof appConfig>;
export type DatabaseConfigType = ReturnType<typeof databaseConfig>;
export type RedisConfigType = ReturnType<typeof redisConfig>;
export type JwtConfigType = ReturnType<typeof jwtConfig>;
export type BullConfigType = ReturnType<typeof bullConfig>;
export type SecurityConfigType = ReturnType<typeof securityConfig>;
export type ServerConfigType = ReturnType<typeof serverConfig>;
