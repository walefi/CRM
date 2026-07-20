import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';

export interface IntegrationJobData {
  tenantId: string;
  integrationId: string;
  action: 'sync' | 'webhook-process' | 'health-check';
  payload?: Record<string, unknown>;
}

@Injectable()
export class IntegrationWorker implements OnModuleInit {
  private readonly logger = new Logger(IntegrationWorker.name);

  constructor(private readonly queueService: QueueService) {}

  onModuleInit() {
    this.registerWorker();
    this.logger.log('IntegrationWorker registered');
  }

  private registerWorker(): void {
    this.queueService.registerWorker(
      'integration-jobs',
      async (job) => {
        const data = job.data as IntegrationJobData;
        this.logger.debug(
          `Processing integration job: ${data.action} for integration=${data.integrationId} tenant=${data.tenantId}`,
        );

        switch (data.action) {
          case 'sync':
            await this.processSync(data);
            break;
          case 'webhook-process':
            await this.processWebhook(data);
            break;
          case 'health-check':
            await this.processHealthCheck(data);
            break;
          default:
            this.logger.warn(`Unknown integration action: ${data.action}`);
        }
      },
      { concurrency: 5 },
    );
  }

  private async processSync(data: IntegrationJobData): Promise<void> {
    this.logger.debug(`Sync job for integration=${data.integrationId}`);
  }

  private async processWebhook(data: IntegrationJobData): Promise<void> {
    this.logger.debug(`Webhook processing job for integration=${data.integrationId}`);
  }

  private async processHealthCheck(data: IntegrationJobData): Promise<void> {
    this.logger.debug(`Health check job for integration=${data.integrationId}`);
  }
}
