import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { IntegrationWorker } from './integration-worker';

@Global()
@Module({
  providers: [QueueService, IntegrationWorker],
  exports: [QueueService],
})
export class QueueModule {}
