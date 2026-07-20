import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ObservabilityApiService } from './observability-api.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Observability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class ObservabilityApiController {
  constructor(private readonly obsService: ObservabilityApiService) {}

  @Get('observability')
  @ApiOperation({ summary: 'Observability overview' })
  getOverview(@CurrentUser('tenantId') tenantId: string) {
    return this.obsService.getOverview(tenantId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get metrics' })
  getMetrics(@CurrentUser('tenantId') tenantId: string, @Query('name') name?: string) {
    return this.obsService.getMetrics(tenantId, name);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get logs' })
  getLogs(@CurrentUser('tenantId') tenantId: string, @Query('severity') severity?: string) {
    return this.obsService.getLogs(tenantId, severity);
  }

  @Get('health')
  @ApiOperation({ summary: 'Get health checks' })
  getHealth(@CurrentUser('tenantId') tenantId: string) {
    return this.obsService.getHealth(tenantId);
  }

  @Post('health/check')
  @Roles('admin')
  @ApiOperation({ summary: 'Run health check' })
  runHealthCheck(@CurrentUser('tenantId') tenantId: string) {
    return this.obsService.runHealthCheck(tenantId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get alert rules' })
  getAlerts(@CurrentUser('tenantId') tenantId: string) {
    return this.obsService.getAlerts(tenantId);
  }

  @Post('alerts')
  @Roles('admin')
  @ApiOperation({ summary: 'Create alert rule' })
  createAlert(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.obsService.createAlert(tenantId, dto);
  }

  @Get('obs-stats')
  @ApiOperation({ summary: 'Observability statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.obsService.getStats(tenantId);
  }
}
