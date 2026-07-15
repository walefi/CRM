import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  API_URL: z.string().default('http://localhost:3001'),
  WEB_PORT: z.coerce.number().default(3000),
  WEB_URL: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string(),
  POSTGRES_USER: z.string().default('crm_user'),
  POSTGRES_PASSWORD: z.string().default('crm_password'),
  POSTGRES_DB: z.string().default('crm_db'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().length(32),
  RATE_LIMIT_TTL: z.coerce.number().default(60),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  BULL_QUEUE_PREFIX: z.string().default('crm'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables: ${result.error.message}`);
  }
  return result.data;
}
