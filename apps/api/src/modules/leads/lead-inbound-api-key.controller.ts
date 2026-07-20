import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadInboundApiKeyService } from './lead-inbound-api-key.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

export class CreateInboundApiKeyDto {
  @ApiProperty({ example: 'Formulário de Contato' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: ['leads:inbound'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}

@ApiTags('Lead Inbound API Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('leads/inbound/api-keys')
export class LeadInboundApiKeyController {
  constructor(private readonly apiKeyService: LeadInboundApiKeyService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List inbound API keys (admin)' })
  listKeys(@CurrentUser('tenantId') tenantId: string) {
    return this.apiKeyService.listApiKeys(tenantId);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create inbound API key (admin)' })
  createKey(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateInboundApiKeyDto,
  ) {
    return this.apiKeyService.createApiKey(tenantId, dto.name, dto.scopes);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke inbound API key (admin)' })
  revokeKey(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.apiKeyService.revokeApiKey(tenantId, id);
  }
}
