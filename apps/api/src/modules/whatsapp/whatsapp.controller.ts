import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { WhatsAppSyncService } from './whatsapp-sync.service';
import { SendWhatsAppMessageDto, WhatsAppConfigDto } from './dto/whatsapp.dto';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly templateService: WhatsAppTemplateService,
    private readonly syncService: WhatsAppSyncService,
  ) {}

  // ── Webhook Verification (Meta GET) ─────────────────────────────────

  @Get('webhook/:tenantId')
  @Public()
  @ApiOperation({ summary: 'Meta webhook verification endpoint' })
  async verifyWebhook(
    @Param('tenantId') tenantId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.whatsappService.verifyWebhook(tenantId, mode, token, challenge);
      res.status(HttpStatus.OK).send(result);
    } catch (error: any) {
      res.status(HttpStatus.FORBIDDEN).json({ error: error.message });
    }
  }

  // ── Webhook Receiver (Meta POST) ────────────────────────────────────

  @Post('webhook/:tenantId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Meta webhook receiver endpoint' })
  async receiveWebhook(
    @Param('tenantId') tenantId: string,
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ) {
    try {
      const entry = (body.entry as any[])?.[0];
      const changes = entry?.changes as any[];
      const value = changes?.[0]?.value;

      if (value?.statuses) {
        await this.whatsappService.processStatusUpdate(tenantId, body);
      }

      if (value?.messages) {
        await this.whatsappService.processIncomingMessage(tenantId, body);
      }

      res.status(HttpStatus.OK).json({ received: true });
    } catch (error: any) {
      this.logger.warn(`Webhook processing error: ${error.message}`);
      res.status(HttpStatus.OK).json({ received: true, error: error.message });
    }
  }

  // ── Config ──────────────────────────────────────────────────────────

  @Get('config')
  @ApiOperation({ summary: 'Get WhatsApp configuration' })
  async getConfig(@CurrentTenant() tenantId: string) {
    return this.whatsappService.getConfig(tenantId);
  }

  @Post('config')
  @ApiOperation({ summary: 'Save WhatsApp configuration' })
  async saveConfig(@CurrentTenant() tenantId: string, @Body() dto: WhatsAppConfigDto) {
    return this.whatsappService.saveConfig(tenantId, dto);
  }

  // ── Send Message ─────────────────────────────────────────────────────

  @Post('send')
  @ApiOperation({ summary: 'Send a WhatsApp text message' })
  async sendMessage(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendWhatsAppMessageDto,
  ) {
    return this.whatsappService.sendMessage(tenantId, userId, dto);
  }

  @Post('send-media')
  @ApiOperation({ summary: 'Send a WhatsApp media message (image/video/audio/document)' })
  async sendMediaMessage(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body()
    dto: {
      to: string;
      mediaUrl: string;
      mediaType: 'image' | 'video' | 'audio' | 'document';
      caption?: string;
      phoneNumberId?: string;
      conversationId?: string;
    },
  ) {
    return this.whatsappService.sendMediaMessage(tenantId, userId, dto);
  }

  // ── Templates ───────────────────────────────────────────────────────

  @Get('templates')
  @ApiOperation({ summary: 'List WhatsApp templates' })
  async getTemplates(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('language') language?: string,
  ) {
    return this.templateService.getTemplates(tenantId, { status, category, language });
  }

  @Get('templates/stats')
  @ApiOperation({ summary: 'Get template statistics' })
  async getTemplateStats(@CurrentTenant() tenantId: string) {
    return this.templateService.getStatistics(tenantId);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  async getTemplate(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.templateService.getTemplate(tenantId, id);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create a new WhatsApp template' })
  async createTemplate(
    @CurrentTenant() tenantId: string,
    @Body()
    dto: {
      name: string;
      language?: string;
      category?: string;
      components?: any;
      variables?: string[];
    },
  ) {
    return this.templateService.createTemplate(tenantId, dto);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update a WhatsApp template' })
  async updateTemplate(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body()
    dto: {
      name?: string;
      language?: string;
      category?: string;
      components?: any;
      variables?: string[];
      status?: string;
    },
  ) {
    return this.templateService.updateTemplate(tenantId, id, dto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete a WhatsApp template' })
  async deleteTemplate(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.templateService.deleteTemplate(tenantId, id);
  }

  @Post('templates/sync')
  @ApiOperation({ summary: 'Sync templates from Meta API' })
  async syncTemplates(@CurrentTenant() tenantId: string) {
    return this.templateService.syncTemplatesFromMeta(tenantId);
  }

  @Post('templates/send')
  @ApiOperation({ summary: 'Send a template message' })
  async sendTemplateMessage(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body()
    dto: {
      to: string;
      templateName: string;
      language?: string;
      variables?: Record<string, string>;
      components?: any[];
    },
  ) {
    return this.templateService.sendTemplateMessage(tenantId, userId, dto);
  }

  // ── Sync ────────────────────────────────────────────────────────────

  @Get('sync/status')
  @ApiOperation({ summary: 'Get sync status' })
  async getSyncStatus(@CurrentTenant() tenantId: string) {
    return this.syncService.getSyncStatus(tenantId);
  }

  @Post('sync/conversations')
  @ApiOperation({ summary: 'Sync conversation history from Meta' })
  async syncConversations(
    @CurrentTenant() tenantId: string,
    @Body() dto: { phoneNumberId: string; contactPhone: string },
  ) {
    return this.syncService.syncConversationHistory(tenantId, dto.phoneNumberId, dto.contactPhone);
  }

  @Post('sync/templates')
  @ApiOperation({ summary: 'Sync templates from Meta API' })
  async syncTemplatesFromMeta(@CurrentTenant() tenantId: string) {
    return this.syncService.syncTemplates(tenantId);
  }

  // ── Deliveries ──────────────────────────────────────────────────────

  @Get('deliveries')
  @ApiOperation({ summary: 'Get delivery tracking records' })
  async getDeliveries(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.whatsappService.getDeliveries(tenantId, {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
