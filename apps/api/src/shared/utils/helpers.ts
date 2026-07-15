import { v4 as uuid } from 'uuid';

export function generateId(): string {
  return uuid();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
}

export function buildCacheKey(namespace: string, ...parts: string[]): string {
  return `${namespace}:${parts.join(':')}`;
}

export function parseJSON<T = unknown>(value: string, fallback: T): T {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function toBoolean(value: string | undefined | boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

export function chunk<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size),
  );
}
