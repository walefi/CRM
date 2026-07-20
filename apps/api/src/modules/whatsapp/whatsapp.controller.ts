import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { WhatsAppService } from './whatsapp.service';
import { SendWhatsAppMessageDto, WhatsAppConfigDto } from './dto/whatsapp.dto';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

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
      // Handle status updates
      const entry = (body.entry as any[])?.[0];
      const changes = entry?.changes as any[];
      const value = changes?.[0]?.value;

      if (value?.statuses) {
        await this.whatsappService.processStatusUpdate(tenantId, body);
      }

      // Handle incoming messages
      if (value?.messages) {
        await this.whatsappService.processIncomingMessage(tenantId, body);
      }

      res.status(HttpStatus.OK).json({ received: true });
    } catch (error: any) {
      this.logger?.warn(`Webhook processing error: ${error.message}`);
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
  @ApiOperation({ summary: 'Send a WhatsApp message' })
  async sendMessage(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendWhatsAppMessageDto,
  ) {
    return this.whatsappService.sendMessage(tenantId, userId, dto);
  }

  private readonly logger = { warn: (_msg: string) => void 0 };
}
