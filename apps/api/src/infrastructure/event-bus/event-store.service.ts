import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IDomainEvent } from './domain-events';

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveEvent(event: IDomainEvent): Promise<void> {
    try {
      await this.prisma.eventStore.create({
        data: {
          id: event.eventId,
          eventName: event.eventName,
          eventType: event.aggregateType || event.eventName,
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          payload: event.payload as any,
          metadata: (event.metadata || {}) as any,
          status: 'PENDING',
          retryCount: 0,
          maxRetries: 3,
          correlationId: event.correlationId,
          causationId: event.causationId,
          version: event.version,
          origin: event.origin,
          tenantId: event.tenantId,
          userId: event.userId,
        },
      });
      this.logger.debug(`Event saved: ${event.eventName} [${event.eventId}]`);
    } catch (error) {
      this.logger.error(
        `Failed to save event: ${event.eventName} [${event.eventId}]`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async saveToOutbox(event: IDomainEvent): Promise<void> {
    try {
      await this.prisma.eventOutbox.create({
        data: {
          eventId: event.eventId,
          eventName: event.eventName,
          payload: event.payload as any,
          metadata: (event.metadata || {}) as any,
          status: 'pending',
        },
      });
      this.logger.debug(`Event saved to outbox: ${event.eventName} [${event.eventId}]`);
    } catch (error) {
      this.logger.error(
        `Failed to save event to outbox: ${event.eventName} [${event.eventId}]`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async markProcessed(eventId: string): Promise<void> {
    try {
      await this.prisma.eventStore.updateMany({
        where: { id: eventId },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });
      this.logger.debug(`Event marked as processed: ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to mark event as processed: ${eventId}`, (error as Error).stack);
      throw error;
    }
  }

  async markFailed(eventId: string, error: string): Promise<void> {
    try {
      const existing = await this.prisma.eventStore.findUnique({ where: { id: eventId } });

      if (!existing) {
        this.logger.warn(`Event not found for marking failed: ${eventId}`);
        return;
      }

      const newRetryCount = existing.retryCount + 1;

      if (newRetryCount >= existing.maxRetries) {
        await this.prisma.eventStore.update({
          where: { id: eventId },
          data: {
            status: 'FAILED',
            error,
            retryCount: newRetryCount,
          },
        });

        await this.prisma.deadLetter.create({
          data: {
            eventId: existing.id,
            eventName: existing.eventName,
            payload: existing.payload as any,
            metadata: existing.metadata as any,
            error,
            retryCount: newRetryCount,
            maxRetries: existing.maxRetries,
            lastRetryAt: new Date(),
            tenantId: existing.tenantId,
          },
        });

        this.logger.warn(`Event moved to dead letter: ${eventId} after ${newRetryCount} retries`);
      } else {
        await this.prisma.eventStore.update({
          where: { id: eventId },
          data: {
            status: 'RETRYING',
            error,
            retryCount: newRetryCount,
          },
        });
        this.logger.warn(
          `Event marked for retry: ${eventId} (attempt ${newRetryCount}/${existing.maxRetries})`,
        );
      }
    } catch (err) {
      this.logger.error(`Failed to mark event as failed: ${eventId}`, (err as Error).stack);
      throw err;
    }
  }

  async getPendingEvents(limit: number = 100): Promise<IDomainEvent[]> {
    const rows = await this.prisma.eventStore.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return rows.map((row) => this.mapRowToDomainEvent(row));
  }

  async getByCorrelationId(correlationId: string): Promise<IDomainEvent[]> {
    const rows = await this.prisma.eventStore.findMany({
      where: { correlationId },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => this.mapRowToDomainEvent(row));
  }

  async getStats(tenantId: string): Promise<{
    total: number;
    pending: number;
    processed: number;
    failed: number;
    deadLetter: number;
  }> {
    const [total, pending, processed, failed, deadLetter] = await Promise.all([
      this.prisma.eventStore.count({ where: { tenantId } }),
      this.prisma.eventStore.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.eventStore.count({ where: { tenantId, status: 'PROCESSED' } }),
      this.prisma.eventStore.count({ where: { tenantId, status: 'FAILED' } }),
      this.prisma.deadLetter.count({ where: { tenantId, resolvedAt: null } }),
    ]);

    return { total, pending, processed, failed, deadLetter };
  }

  private mapRowToDomainEvent(row: {
    id: string;
    eventName: string;
    aggregateId: string | null;
    aggregateType: string | null;
    payload: unknown;
    metadata: unknown;
    correlationId: string | null;
    causationId: string | null;
    version: number;
    origin: string | null;
    tenantId: string;
    userId: string | null;
    createdAt: Date;
  }): IDomainEvent {
    return {
      eventId: row.id,
      eventName: row.eventName,
      aggregateId: row.aggregateId || undefined,
      aggregateType: row.aggregateType || undefined,
      payload: row.payload as Record<string, unknown>,
      metadata: row.metadata as Record<string, unknown> | undefined,
      timestamp: row.createdAt,
      tenantId: row.tenantId,
      userId: row.userId || undefined,
      version: row.version,
      correlationId: row.correlationId || undefined,
      causationId: row.causationId || undefined,
      origin: row.origin || undefined,
    };
  }
}
