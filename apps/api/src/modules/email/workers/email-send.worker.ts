import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { EmailService, EmailJobData } from '../email.service';

@Injectable()
export class EmailSendWorker implements OnModuleInit {
  private readonly logger = new Logger(EmailSendWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    this.registerWorker();
    this.logger.log('EmailSendWorker registered');
  }

  private registerWorker(): void {
    this.queueService.registerWorker(
      EmailService.QUEUE_NAME,
      async (job) => {
        const data = job.data as EmailJobData;
        this.logger.debug(
          `Processing email job: messageId=${data.messageId} tenant=${data.tenantId}`,
        );

        await this.emailService.processSendEmail(data);
      },
      {
        concurrency: 3,
      },
    );
  }
}
