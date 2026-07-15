import { Logger } from '@nestjs/common';
import { config as dotenvConfig } from 'dotenv';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

const logger = new Logger('ConfigFactory');

const configs: Map<string, unknown> = new Map();

function loadEnvFiles() {
  const rootPath = resolve(__dirname, '..', '..', '..', '..');
  
  const envFiles = [
    join(rootPath, '.env.local'),
    join(rootPath, '.env'),
  ];

  for (const envFile of envFiles) {
    if (existsSync(envFile)) {
      dotenvConfig({ path: envFile });
      logger.log(`Loaded environment from ${envFile}`);
    }
  }
}

export function defineConfig<T>(factory: () => T): () => T {
  return () => {
    const key = factory.toString().slice(0, 100);
    if (configs.has(key)) {
      return configs.get(key) as T;
    }
    try {
      const result = factory();
      configs.set(key, result);
      return result;
    } catch (error) {
      logger.error(`Failed to load configuration: ${error}`);
      throw error;
    }
  };
}

export function validateRequiredEnv() {
  loadEnvFiles();

  const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(message);
    throw new Error(message);
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey && encryptionKey.length !== 32) {
    logger.warn('ENCRYPTION_KEY should be exactly 32 characters');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    logger.warn('JWT_SECRET should be at least 32 characters for production security');
  }

  logger.log('Environment variables validated successfully');
}

export { appConfig, databaseConfig, redisConfig, jwtConfig, bullConfig, securityConfig, serverConfig } from './index';
export type {
  AppConfigType,
  DatabaseConfigType,
  RedisConfigType,
  JwtConfigType,
  BullConfigType,
  SecurityConfigType,
  ServerConfigType,
} from './index';
