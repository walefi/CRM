import { Module, Global, OnModuleInit } from '@nestjs/common';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { SlaWorker } from './sla.worker';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';

@Global()
@Module({
  controllers: [SlaController],
  providers: [
    SlaService,
    {
      provide: SlaWorker,
      useFactory: (
        queueService: QueueService,
        prisma: PrismaService,
        eventBus: EventBusService,
        notificationsService: NotificationsService,
      ) => {
        const worker = new SlaWorker(queueService, prisma, eventBus, notificationsService);
        worker.register();
        return worker;
      },
      inject: [QueueService, PrismaService, EventBusService, NotificationsService],
    },
  ],
  exports: [SlaService],
})
export class SlaModule implements OnModuleInit {
  constructor(private readonly slaService: SlaService) {}

  async onModuleInit() {
    try {
      await this.slaService.scheduleCheck();
    } catch {
      // SLA scheduling is optional - may fail if Redis is not available
    }
  }
}
