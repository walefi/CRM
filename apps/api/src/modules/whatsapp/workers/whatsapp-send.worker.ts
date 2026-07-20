import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { WhatsAppService, WhatsAppJobData } from '../whatsapp.service';

@Injectable()
export class WhatsAppSendWorker implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppSendWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  onModuleInit() {
    this.registerWorker();
    this.logger.log('WhatsAppSendWorker registered');
  }

  private registerWorker(): void {
    this.queueService.registerWorker(
      WhatsAppService.QUEUE_NAME,
      async (job) => {
        const data = job.data as WhatsAppJobData;
        this.logger.debug(
          `Processing WhatsApp job: messageId=${data.messageId} tenant=${data.tenantId}`,
        );

        await this.whatsappService.processSendJob(data);
      },
      {
        concurrency: 3,
      },
    );
  }
}
