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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
