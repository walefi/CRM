import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SignaturesService } from './signatures.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Signatures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('signatures')
export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Get()
  @ApiOperation({ summary: 'List signature requests' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.signaturesService.getRequests(tenantId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Signature statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.signaturesService.getStats(tenantId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List signature templates' })
  getTemplates(@CurrentUser('tenantId') tenantId: string) {
    return this.signaturesService.getTemplates(tenantId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create template' })
  createTemplate(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.signaturesService.createTemplate(tenantId, userId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create signature request' })
  create(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.signaturesService.createRequest(tenantId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get signature request' })
  findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.signaturesService.getRequest(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update signature request' })
  update(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.signaturesService.updateRequest(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete signature request' })
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.signaturesService.deleteRequest(tenantId, id);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send signature request' })
  send(@CurrentUser('tenantId') tenantId: string, @Body() dto: { requestId: string }) {
    return this.signaturesService.sendRequest(tenantId, dto.requestId);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel signature request' })
  cancel(@CurrentUser('tenantId') tenantId: string, @Body() dto: { requestId: string }) {
    return this.signaturesService.cancelRequest(tenantId, dto.requestId);
  }

  @Post('reminder')
  @ApiOperation({ summary: 'Send reminder' })
  reminder(@CurrentUser('tenantId') tenantId: string, @Body() dto: { requestId: string }) {
    return this.signaturesService.sendReminder(tenantId, dto.requestId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle provider webhook' })
  webhook(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.signaturesService.handleWebhook(tenantId, dto);
  }
}
