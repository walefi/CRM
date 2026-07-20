import { Module, Global, OnModuleInit } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LeadScoringService } from './lead-scoring.service';
import { AiSummaryService } from './ai-summary.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { AiAssistantService } from './ai-assistant.service';
import { PromptBuilderService } from './prompt-builder.service';
import { AiExecutionLogService } from './ai-execution-log.service';
import { AiWorker } from './ai.worker';
import { QueueService } from '../../infrastructure/queue/queue.service';

@Global()
@Module({
  controllers: [AiController],
  providers: [
    AiService,
    LeadScoringService,
    AiSummaryService,
    AiRecommendationService,
    AiAssistantService,
    PromptBuilderService,
    AiExecutionLogService,
  ],
  exports: [
    AiService,
    LeadScoringService,
    AiSummaryService,
    AiRecommendationService,
    AiAssistantService,
    PromptBuilderService,
    AiExecutionLogService,
  ],
})
export class AiModule implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly leadScoring: LeadScoringService,
    private readonly summaryService: AiSummaryService,
    private readonly recommendationService: AiRecommendationService,
    private readonly executionLog: AiExecutionLogService,
  ) {}

  onModuleInit() {
    try {
      new AiWorker(
        this.queueService,
        this.leadScoring,
        this.summaryService,
        this.recommendationService,
        this.executionLog,
      );
    } catch {
      // Queue service may not be available in tests
    }
  }
}
