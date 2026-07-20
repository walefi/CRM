export const APP_NAME = 'CRM Enterprise';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Enterprise CRM Platform';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const AUTH_STRATEGIES = {
  JWT: 'jwt',
  JWT_REFRESH: 'jwt-refresh',
} as const;

export const REQUEST_HEADERS = {
  REQUEST_ID: 'x-request-id',
  CORRELATION_ID: 'x-correlation-id',
  TENANT_ID: 'x-tenant-id',
} as const;

export const CACHE_PREFIXES = {
  SESSION: 'session',
  USER: 'user',
  TENANT: 'tenant',
  RATE_LIMIT: 'rate-limit',
} as const;

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  AUTOMATIONS: 'automations',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  AUDIT: 'audit',
} as const;
