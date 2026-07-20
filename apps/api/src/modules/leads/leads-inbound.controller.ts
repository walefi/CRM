import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { PublicLeadIntakeDto } from './dto/leads.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RequiresApiKey } from '../../common/decorators/requires-api-key.decorator';
import { LeadInboundApiKeyGuard } from '../../common/guards/lead-inbound-api-key.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Leads - Inbound')
@ApiExcludeController()
@Controller('leads')
export class LeadsInboundController {
  private readonly logger = new Logger(LeadsInboundController.name);

  constructor(private readonly leadsService: LeadsService) {}

  @Public()
  @RequiresApiKey()
  @UseGuards(LeadInboundApiKeyGuard)
  @Post('inbound')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit inbound lead from form, webhook or API' })
  async inbound(@Body() dto: PublicLeadIntakeDto, @Req() req: any) {
    if (dto.website && dto.website.length > 0) {
      this.logger.log(`Honeypot triggered, rejecting lead submission`);
      return { success: true, message: 'Lead recebido com sucesso' };
    }

    const tenantId = req.tenantId || req.apiKey?.tenantId;

    if (!tenantId) {
      this.logger.error('No tenantId resolved from API key');
      return { success: false, message: 'Erro interno' };
    }

    this.logger.log(
      `Inbound lead received: source=${dto.source} tenant=${tenantId} name=${dto.name}`,
    );

    const intakeDto = {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      company: dto.company,
      message: dto.message,
      source: dto.source,
      sourceDetails: dto.sourceDetails,
      tenantId,
    };

    return this.leadsService.intake(tenantId, intakeDto);
  }
}
