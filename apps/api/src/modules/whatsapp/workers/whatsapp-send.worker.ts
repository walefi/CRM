import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { WhatsAppService, WhatsAppJobData, WhatsAppMediaJobData } from '../whatsapp.service';

@Injectable()
export class WhatsAppSendWorker implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppSendWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  onModuleInit() {
    this.registerWorkers();
    this.logger.log('WhatsAppSendWorker registered');
  }

  private registerWorkers(): void {
    this.queueService.registerWorker(
      WhatsAppService.QUEUE_NAME,
      async (job) => {
        if (job.name === 'send-whatsapp') {
          const data = job.data as WhatsAppJobData;
          this.logger.debug(
            `Processing WhatsApp text job: messageId=${data.messageId} tenant=${data.tenantId}`,
          );
          await this.whatsappService.processSendJob(data);
        } else if (job.name === 'send-whatsapp-media') {
          const data = job.data as WhatsAppMediaJobData;
          this.logger.debug(
            `Processing WhatsApp media job: messageId=${data.messageId} type=${data.mediaType} tenant=${data.tenantId}`,
          );
          await this.whatsappService.processMediaSendJob(data);
        }
      },
      {
        concurrency: 3,
      },
    );
  }
}
