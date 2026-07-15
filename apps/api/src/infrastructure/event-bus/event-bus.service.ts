import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IDomainEvent } from './domain-events';
import { EventStoreService } from './event-store.service';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async publish(event: IDomainEvent): Promise<void> {
    await this.eventStore.saveEvent(event);
    this.eventEmitter.emit(event.eventName, event);
    this.logger.log(
      `Event published: ${event.eventName} [${event.eventId}] tenant=${event.tenantId}`,
    );
  }

  async publishAsync(event: IDomainEvent): Promise<void> {
    await this.eventStore.saveEvent(event);
    await this.eventEmitter.emitAsync(event.eventName, event);
    this.logger.log(
      `Event published async: ${event.eventName} [${event.eventId}] tenant=${event.tenantId}`,
    );
  }

  subscribe(eventName: string, handler: (event: IDomainEvent) => Promise<void>): void {
    this.eventEmitter.on(eventName, async (event: IDomainEvent) => {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          `Handler failed for event "${eventName}": ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    });
    this.logger.debug(`Subscribed to event: ${eventName}`);
  }

  async retry(eventId: string): Promise<void> {
    const pendingEvents = await this.eventStore.getPendingEvents(1);
    const event = pendingEvents.find((e) => e.eventId === eventId);

    if (!event) {
      this.logger.warn(`Event not found or not pending for retry: ${eventId}`);
      return;
    }

    this.logger.log(`Retrying event: ${event.eventName} [${eventId}]`);
    await this.publish(event);
  }
}
