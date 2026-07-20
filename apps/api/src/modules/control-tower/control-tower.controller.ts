import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ControlTowerService } from './control-tower.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('ControlTower')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class ControlTowerController {
  constructor(private readonly ctService: ControlTowerService) {}

  @Get('control-tower')
  @ApiOperation({ summary: 'Control tower overview' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.ctService.getStats(tenantId);
  }

  @Get('executive-dashboard')
  @ApiOperation({ summary: 'Executive dashboard' })
  getExecutiveDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.ctService.getExecutiveDashboard(tenantId);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get KPIs' })
  getKPIs(@CurrentUser('tenantId') tenantId: string) {
    return this.ctService.getKPIs(tenantId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get operational alerts' })
  getAlerts(@CurrentUser('tenantId') tenantId: string) {
    return this.ctService.getAlerts(tenantId);
  }

  @Post('alerts')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create alert' })
  createAlert(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.ctService.createAlert(tenantId, dto);
  }

  @Get('risks')
  @ApiOperation({ summary: 'Get risk events' })
  getRisks(@CurrentUser('tenantId') tenantId: string) {
    return this.ctService.getRisks(tenantId);
  }

  @Post('risks')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create risk event' })
  createRisk(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.ctService.createRisk(tenantId, userId, dto);
  }

  @Get('planning')
  @ApiOperation({ summary: 'Get planning scenarios' })
  getScenarios(@CurrentUser('tenantId') tenantId: string) {
    return this.ctService.getScenarios(tenantId);
  }

  @Post('planning')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create scenario' })
  createScenario(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.ctService.createScenario(tenantId, userId, dto);
  }
}
