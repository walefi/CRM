import { Logger } from '@nestjs/common';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { LeadScoringService } from './lead-scoring.service';
import { AiSummaryService } from './ai-summary.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { AiExecutionLogService } from './ai-execution-log.service';

export class AiWorker {
  private readonly logger = new Logger(AiWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly leadScoring: LeadScoringService,
    private readonly summaryService: AiSummaryService,
    private readonly recommendationService: AiRecommendationService,
    private readonly executionLog: AiExecutionLogService,
  ) {
    this.registerWorkers();
  }

  private registerWorkers() {
    this.queueService.registerWorker('ai-lead-scoring', async (job) => {
      const { tenantId, leadId } = job.data;
      this.logger.log(`Processing lead scoring for lead ${leadId}`);
      const start = Date.now();
      try {
        const result = await this.leadScoring.scoreLead(tenantId, leadId);
        await this.executionLog.log({
          action: 'lead_scoring',
          entityType: 'lead',
          entityId: leadId,
          response: JSON.stringify(result),
          durationMs: Date.now() - start,
          success: true,
          tenantId,
        });
      } catch (error: any) {
        await this.executionLog.log({
          action: 'lead_scoring',
          entityType: 'lead',
          entityId: leadId,
          error: error.message,
          durationMs: Date.now() - start,
          success: false,
          tenantId,
        });
        throw error;
      }
    });

    this.queueService.registerWorker('ai-batch-scoring', async (job) => {
      const { tenantId } = job.data;
      this.logger.log(`Processing batch lead scoring for tenant ${tenantId}`);
      const start = Date.now();
      try {
        const result = await this.leadScoring.scoreAllLeads(tenantId);
        await this.executionLog.log({
          action: 'batch_scoring',
          entityType: 'lead',
          response: JSON.stringify(result),
          durationMs: Date.now() - start,
          success: true,
          tenantId,
        });
      } catch (error: any) {
        await this.executionLog.log({
          action: 'batch_scoring',
          entityType: 'lead',
          error: error.message,
          durationMs: Date.now() - start,
          success: false,
          tenantId,
        });
        throw error;
      }
    });

    this.queueService.registerWorker('ai-summarize', async (job) => {
      const { tenantId, entityType, entityId } = job.data;
      this.logger.log(`Processing summary for ${entityType}:${entityId}`);
      const start = Date.now();
      try {
        const result = await this.summaryService.summarize(tenantId, entityType, entityId);
        await this.executionLog.log({
          action: 'summarize',
          entityType,
          entityId,
          response: result.summary,
          durationMs: Date.now() - start,
          success: true,
          tenantId,
        });
      } catch (error: any) {
        await this.executionLog.log({
          action: 'summarize',
          entityType,
          entityId,
          error: error.message,
          durationMs: Date.now() - start,
          success: false,
          tenantId,
        });
        throw error;
      }
    });

    this.queueService.registerWorker('ai-recommendations', async (job) => {
      const { tenantId } = job.data;
      this.logger.log(`Processing recommendations for tenant ${tenantId}`);
      const start = Date.now();
      try {
        const result = await this.recommendationService.generateRecommendations(tenantId);
        await this.executionLog.log({
          action: 'generate_recommendations',
          response: JSON.stringify({ count: result.length }),
          durationMs: Date.now() - start,
          success: true,
          tenantId,
        });
      } catch (error: any) {
        await this.executionLog.log({
          action: 'generate_recommendations',
          error: error.message,
          durationMs: Date.now() - start,
          success: false,
          tenantId,
        });
        throw error;
      }
    });

    this.logger.log('AI workers registered');
  }
}
