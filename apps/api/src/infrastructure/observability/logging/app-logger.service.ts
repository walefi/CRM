import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import * as winston from 'winston';

export interface RequestContext {
  requestId: string;
  correlationId: string;
  userId?: string;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

@Injectable({ scope: Scope.DEFAULT })
export class AppLogger implements LoggerService {
  private readonly logger: winston.Logger;
  private context: string;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger = winston.createLogger({
      level: isProduction ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        isProduction ? winston.format.json() : winston.format.simple(),
      ),
      transports: [
        new winston.transports.Console({
          format: isProduction
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize({ all: true }),
                winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
                winston.format.printf(({ timestamp, level, message, context: ctx, ...meta }) => {
                  const reqCtx = getRequestContext();
                  const ids = reqCtx
                    ? `\x1b[90m[${reqCtx.requestId.slice(0, 8)}|${(reqCtx.correlationId || '').slice(0, 8)}]\x1b[0m`
                    : '';
                  const c = ctx ? `\x1b[33m[${ctx}]\x1b[0m` : '';
                  const extra =
                    Object.keys(meta).length > 5 ? `\n${JSON.stringify(meta, null, 2)}` : '';
                  return `${timestamp} ${ids} ${level} ${c} ${message}${extra}`;
                }),
              ),
        }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: unknown, ..._optionalParams: unknown[]) {
    this.logger.info(this.formatMessage(message));
  }

  error(message: unknown, trace?: string, ..._optionalParams: unknown[]) {
    const reqCtx = getRequestContext();
    const meta = {
      trace,
      stack: trace,
      requestId: reqCtx?.requestId,
      correlationId: reqCtx?.correlationId,
      userId: reqCtx?.userId,
      tenantId: reqCtx?.tenantId,
      ip: reqCtx?.ip,
      userAgent: reqCtx?.userAgent,
    };
    this.logger.error(this.formatMessage(message), { ...meta, context: this.context });
  }

  warn(message: unknown, ..._optionalParams: unknown[]) {
    this.logger.warn(this.formatMessage(message));
  }

  debug(message: unknown, ..._optionalParams: unknown[]) {
    this.logger.debug(this.formatMessage(message));
  }

  verbose(message: unknown, ..._optionalParams: unknown[]) {
    this.logger.verbose(this.formatMessage(message));
  }

  private formatMessage(message: unknown): string {
    return typeof message === 'string' ? message : JSON.stringify(message);
  }
}
