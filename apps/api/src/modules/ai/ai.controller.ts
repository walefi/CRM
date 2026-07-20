import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { LeadScoringService } from './lead-scoring.service';
import { AiSummaryService } from './ai-summary.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { AiAssistantService } from './ai-assistant.service';
import { PromptBuilderService } from './prompt-builder.service';
import { AiExecutionLogService } from './ai-execution-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly leadScoring: LeadScoringService,
    private readonly summaryService: AiSummaryService,
    private readonly recommendationService: AiRecommendationService,
    private readonly assistantService: AiAssistantService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly executionLog: AiExecutionLogService,
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'AI dashboard overview' })
  async getDashboard(@CurrentUser('tenantId') tenantId: string) {
    const [scoreStats, recommendations, usage, logs] = await Promise.all([
      this.leadScoring.getScoreStats(tenantId),
      this.recommendationService.getRecommendations(tenantId, undefined, 5),
      this.aiService.getUsage(tenantId, 'month'),
      this.executionLog.getStats(tenantId),
    ]);

    return {
      scoreStats,
      recommendations,
      usage,
      logs,
    };
  }

  @Post('ask')
  @ApiOperation({ summary: 'Ask the AI assistant' })
  async ask(@CurrentUser('tenantId') tenantId: string, @Body() dto: { question: string }) {
    const start = Date.now();
    const result = await this.assistantService.ask(tenantId, dto.question);
    await this.executionLog.log({
      action: 'ask',
      prompt: dto.question,
      response: result.answer,
      durationMs: Date.now() - start,
      success: true,
      tenantId,
    });
    return result;
  }

  @Post('score')
  @ApiOperation({ summary: 'Score a lead' })
  async scoreLead(@CurrentUser('tenantId') tenantId: string, @Body() dto: { leadId: string }) {
    return this.leadScoring.scoreLead(tenantId, dto.leadId);
  }

  @Post('score/batch')
  @ApiOperation({ summary: 'Batch score all leads' })
  async scoreBatch(@CurrentUser('tenantId') tenantId: string) {
    const job = await this.queueService.addJob('ai-batch-scoring', 'batch-score', { tenantId });
    return { jobId: job.id, status: 'queued', message: 'Batch scoring job queued' };
  }

  @Get('score/stats')
  @ApiOperation({ summary: 'Lead scoring statistics' })
  async getScoreStats(@CurrentUser('tenantId') tenantId: string) {
    return this.leadScoring.getScoreStats(tenantId);
  }

  @Get('score/history/:leadId')
  @ApiOperation({ summary: 'Lead score history' })
  async getScoreHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Param('leadId') leadId: string,
    @Query('limit') limit?: number,
  ) {
    return this.leadScoring.getScoreHistory(tenantId, leadId, limit);
  }

  @Get('score/classification/:classification')
  @ApiOperation({ summary: 'Get leads by score classification' })
  async getLeadsByScore(
    @CurrentUser('tenantId') tenantId: string,
    @Param('classification') classification: string,
    @Query('limit') limit?: number,
  ) {
    return this.leadScoring.getLeadsByScore(tenantId, classification, limit);
  }

  @Post('summarize')
  @ApiOperation({ summary: 'Summarize an entity' })
  async summarize(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: { entityType: string; entityId: string },
  ) {
    const start = Date.now();
    const result = await this.summaryService.summarize(tenantId, dto.entityType, dto.entityId);
    await this.executionLog.log({
      action: 'summarize',
      entityType: dto.entityType,
      entityId: dto.entityId,
      response: result.summary,
      durationMs: Date.now() - start,
      success: true,
      tenantId,
    });
    return result;
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get AI recommendations' })
  async getRecommendations(
    @CurrentUser('tenantId') tenantId: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: number,
  ) {
    return this.recommendationService.getRecommendations(tenantId, entityType, limit);
  }

  @Post('recommendations/generate')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Generate new recommendations' })
  async generateRecommendations(@CurrentUser('tenantId') tenantId: string) {
    const job = await this.queueService.addJob('ai-recommendations', 'generate', { tenantId });
    return { jobId: job.id, status: 'queued' };
  }

  @Post('recommendations/:id/accept')
  @ApiOperation({ summary: 'Accept a recommendation' })
  async acceptRecommendation(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.recommendationService.acceptRecommendation(tenantId, id);
  }

  @Post('recommendations/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss a recommendation' })
  async dismissRecommendation(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.recommendationService.dismissRecommendation(tenantId, id);
  }

  @Post('generate-email')
  @ApiOperation({ summary: 'Generate an email' })
  async generateEmail(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: { entityType?: string; entityId?: string; purpose?: string; tone?: string },
  ) {
    const context = {
      entityType: dto.entityType,
      entityId: dto.entityId,
      extra: { purpose: dto.purpose, tone: dto.tone },
    };
    if (dto.entityType && dto.entityId) {
      context.entityType = dto.entityType;
    }
    const prompt = await this.promptBuilder.buildEmailGenerationPrompt(tenantId, context);
    const result = await this.aiService.complete(tenantId, '', { prompt, model: 'gpt-4o' });
    await this.executionLog.log({
      action: 'generate_email',
      entityType: dto.entityType,
      entityId: dto.entityId,
      prompt,
      response: result.response,
      model: result.model,
      provider: result.provider,
      tokens: result.tokens,
      cost: result.cost,
      durationMs: result.durationMs,
      success: true,
      tenantId,
    });
    return { ...result, prompt };
  }

  @Post('generate-message')
  @ApiOperation({ summary: 'Generate a message' })
  async generateMessage(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: { entityType?: string; entityId?: string; purpose?: string; channel?: string },
  ) {
    const context = {
      entityType: dto.entityType,
      entityId: dto.entityId,
      extra: { purpose: dto.purpose, channel: dto.channel },
    };
    const prompt = await this.promptBuilder.buildMessageGenerationPrompt(tenantId, context);
    const result = await this.aiService.complete(tenantId, '', { prompt, model: 'gpt-4o' });
    await this.executionLog.log({
      action: 'generate_message',
      entityType: dto.entityType,
      entityId: dto.entityId,
      prompt,
      response: result.response,
      model: result.model,
      provider: result.provider,
      tokens: result.tokens,
      cost: result.cost,
      durationMs: result.durationMs,
      success: true,
      tenantId,
    });
    return { ...result, prompt };
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get commercial insights' })
  async getInsights(@CurrentUser('tenantId') tenantId: string) {
    const prismaAny = this.prisma as any;

    const [leads, deals, tasks, tickets, activities] = await Promise.all([
      prismaAny.lead.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      prismaAny.deal.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      prismaAny.task.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      prismaAny.ticket.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      prismaAny.activity.groupBy({
        by: ['type'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
    ]);

    return {
      leads: { byStatus: leads.map((l: any) => ({ status: l.status, count: l._count })) },
      deals: { byStatus: deals.map((d: any) => ({ status: d.status, count: d._count })) },
      tasks: { byStatus: tasks.map((t: any) => ({ status: t.status, count: t._count })) },
      tickets: { byStatus: tickets.map((t: any) => ({ status: t.status, count: t._count })) },
      activities: { byType: activities.map((a: any) => ({ type: a.type, count: a._count })) },
    };
  }

  @Get('logs')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get AI execution logs' })
  async getLogs(
    @CurrentUser('tenantId') tenantId: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.executionLog.getLogs(tenantId, { action, entityType, page, limit });
  }

  @Get('logs/stats')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get AI execution log stats' })
  async getLogStats(@CurrentUser('tenantId') tenantId: string) {
    return this.executionLog.getStats(tenantId);
  }

  @Get('providers')
  @ApiOperation({ summary: 'List AI providers' })
  getProviders() {
    return this.aiService.getProviders();
  }

  @Get('models')
  @ApiOperation({ summary: 'List models by provider' })
  getModels(@Query('provider') provider?: string) {
    return this.aiService.getModels(provider);
  }

  @Get('agents')
  @ApiOperation({ summary: 'List agents (built-in + custom)' })
  getAgents() {
    return { builtIn: this.aiService.getAgents() };
  }

  @Get('agents/list')
  @ApiOperation({ summary: 'List custom agents' })
  getAgentsList(@CurrentUser('tenantId') tenantId: string) {
    return this.aiService.getAgentsList(tenantId);
  }

  @Get('tools')
  @ApiOperation({ summary: 'List available tools' })
  getTools() {
    return this.aiService.getTools();
  }

  @Get('prompts')
  @ApiOperation({ summary: 'List prompts' })
  getPrompts(@CurrentUser('tenantId') tenantId: string, @Query('category') category?: string) {
    return this.aiService.getPrompts(tenantId, category);
  }

  @Post('prompts')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create prompt template' })
  createPrompt(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.aiService.createPrompt(tenantId, userId, dto);
  }

  @Patch('prompts/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update prompt' })
  updatePrompt(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.aiService.updatePrompt(tenantId, id, dto);
  }

  @Delete('prompts/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete prompt' })
  deletePrompt(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.aiService.deletePrompt(tenantId, id);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI' })
  chat(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.aiService.chat(tenantId, userId, dto);
  }

  @Post('complete')
  @ApiOperation({ summary: 'AI completion' })
  complete(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.aiService.complete(tenantId, userId, dto);
  }

  @Post('agent/run')
  @ApiOperation({ summary: 'Execute AI agent' })
  runAgent(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.aiService.runAgent(tenantId, userId, dto);
  }

  @Post('agent')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create custom agent' })
  createAgent(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.aiService.createAgent(tenantId, userId, dto);
  }

  @Post('tool')
  @ApiOperation({ summary: 'Execute AI tool' })
  executeTool(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.aiService.executeTool(tenantId, userId, dto);
  }

  @Get('memory/:key')
  @ApiOperation({ summary: 'Get memory value' })
  getMemory(@CurrentUser('tenantId') tenantId: string, @Param('key') key: string) {
    return this.aiService.getMemory(tenantId, key);
  }

  @Post('memory')
  @ApiOperation({ summary: 'Set memory value' })
  setMemory(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.aiService.setMemory(tenantId, userId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Conversation history' })
  getHistory(@CurrentUser('tenantId') tenantId: string, @Query('page') page?: number) {
    return this.aiService.getHistory(tenantId, page);
  }

  @Get('usage')
  @ApiOperation({ summary: 'AI usage & cost analytics' })
  getUsage(@CurrentUser('tenantId') tenantId: string, @Query('period') period?: string) {
    return this.aiService.getUsage(tenantId, period);
  }

  @Post('rag')
  @ApiOperation({ summary: 'RAG search in knowledge base' })
  ragSearch(@CurrentUser('tenantId') tenantId: string, @Body() dto: { query: string }) {
    return this.aiService.ragSearch(tenantId, dto.query);
  }

  @Post('embed')
  @ApiOperation({ summary: 'Generate embeddings' })
  embed(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.aiService.embed(tenantId, dto);
  }

  @Get('health')
  @ApiOperation({ summary: 'AI platform health' })
  health() {
    return this.aiService.health();
  }
}
