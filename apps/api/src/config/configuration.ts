export interface AppConfig {
  nodeEnv: string;
  port: number;
  url: string;
}

export interface DatabaseConfig {
  url: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  expiration: string;
  refreshExpiration: string;
}

export interface SecurityConfig {
  encryptionKey: string;
  rateLimitTtl: number;
  rateLimitMax: number;
  corsOrigin: string;
}
