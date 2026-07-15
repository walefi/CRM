import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';
import { EventStoreService } from './event-store.service';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' })],
  providers: [EventBusService, EventStoreService],
  exports: [EventBusService, EventStoreService],
})
export class EventBusModule {}
