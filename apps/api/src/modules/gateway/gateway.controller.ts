import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GatewayService } from './gateway.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Gateway')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Get('gateway/apis')
  @ApiOperation({ summary: 'List API applications' })
  getApplications(@CurrentUser('tenantId') tenantId: string) {
    return this.gatewayService.getApplications(tenantId);
  }

  @Post('apikey')
  @Roles('admin')
  @ApiOperation({ summary: 'Create API application' })
  createApplication(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.gatewayService.createApplication(tenantId, userId, dto);
  }

  @Get('connectors')
  @ApiOperation({ summary: 'List connectors' })
  getConnectors(@CurrentUser('tenantId') tenantId: string) {
    return this.gatewayService.getConnectors(tenantId);
  }

  @Post('connector/install')
  @Roles('admin')
  @ApiOperation({ summary: 'Install connector' })
  installConnector(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.gatewayService.installConnector(tenantId, dto);
  }

  @Get('plugins')
  @ApiOperation({ summary: 'List plugins' })
  getPlugins(@CurrentUser('tenantId') tenantId: string) {
    return this.gatewayService.getPlugins(tenantId);
  }

  @Post('plugin/install')
  @Roles('admin')
  @ApiOperation({ summary: 'Install plugin' })
  installPlugin(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.gatewayService.installPlugin(tenantId, dto);
  }

  @Get('marketplace')
  @ApiOperation({ summary: 'Browse marketplace' })
  getMarketplace(@CurrentUser('tenantId') tenantId: string, @Query('category') category?: string) {
    return this.gatewayService.getMarketplace(tenantId, category);
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'List webhooks' })
  getWebhooks(@CurrentUser('tenantId') tenantId: string) {
    return this.gatewayService.getWebhooks(tenantId);
  }

  @Post('webhook')
  @Roles('admin')
  @ApiOperation({ summary: 'Create webhook' })
  createWebhook(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.gatewayService.createWebhook(tenantId, dto);
  }

  @Post('webhook/test')
  @Roles('admin')
  @ApiOperation({ summary: 'Test webhook delivery' })
  testWebhook(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.gatewayService.simulateWebhookDelivery(tenantId, dto);
  }

  @Get('gateway-stats')
  @ApiOperation({ summary: 'Gateway statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.gatewayService.getStats(tenantId);
  }
}
