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
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsFilterDto,
  CreateDashboardDto,
  UpdateDashboardDto,
  SaveDashboardTemplateDto,
} from './dto/analytics.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get KPI metrics' })
  getKPIs(@CurrentUser('tenantId') tenantId: string, @Query() filter: AnalyticsFilterDto) {
    return this.analyticsService.getKPIs(tenantId, filter);
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Get sales funnel data' })
  getFunnel(@CurrentUser('tenantId') tenantId: string, @Query() filter: AnalyticsFilterDto) {
    return this.analyticsService.getFunnel(tenantId, filter);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue by period' })
  getRevenue(@CurrentUser('tenantId') tenantId: string, @Query() filter: AnalyticsFilterDto) {
    return this.analyticsService.getRevenueByPeriod(tenantId, filter);
  }

  @Get('deals-by-stage')
  @ApiOperation({ summary: 'Get deals grouped by pipeline stage' })
  getDealsByStage(@CurrentUser('tenantId') tenantId: string, @Query() filter: AnalyticsFilterDto) {
    return this.analyticsService.getDealsByStage(tenantId, filter);
  }

  @Get('deals-by-owner')
  @ApiOperation({ summary: 'Get deals by owner ranking' })
  getDealsByOwner(@CurrentUser('tenantId') tenantId: string, @Query() filter: AnalyticsFilterDto) {
    return this.analyticsService.getDealsByOwner(tenantId, filter);
  }

  @Get('leads-by-source')
  @ApiOperation({ summary: 'Get leads by source' })
  getLeadsBySource(@CurrentUser('tenantId') tenantId: string, @Query() filter: AnalyticsFilterDto) {
    return this.analyticsService.getLeadsBySource(tenantId, filter);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get analytics events' })
  getEvents(
    @CurrentUser('tenantId') tenantId: string,
    @Query('eventName') eventName?: string,
    @Query('page') page?: number,
  ) {
    return this.analyticsService.getEvents(tenantId, eventName, page);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get analytics engine statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.analyticsService.getStats(tenantId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'List dashboards' })
  getDashboards(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.analyticsService.getDashboards(tenantId, userId);
  }

  @Get('dashboard/:id')
  @ApiOperation({ summary: 'Get dashboard by ID' })
  getDashboard(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.analyticsService.getDashboard(tenantId, id);
  }

  @Post('dashboard')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create dashboard' })
  createDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDashboardDto,
  ) {
    return this.analyticsService.createDashboard(tenantId, userId, dto);
  }

  @Patch('dashboard/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update dashboard' })
  updateDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDashboardDto,
  ) {
    return this.analyticsService.updateDashboard(tenantId, id, dto);
  }

  @Delete('dashboard/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete dashboard' })
  deleteDashboard(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.analyticsService.deleteDashboard(tenantId, id);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List dashboard templates' })
  getTemplates(@CurrentUser('tenantId') tenantId: string) {
    return this.analyticsService.getTemplates(tenantId);
  }

  @Post('templates')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Save dashboard template' })
  saveTemplate(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SaveDashboardTemplateDto,
  ) {
    return this.analyticsService.saveTemplate(tenantId, userId, dto);
  }

  @Post('recalculate')
  @Roles('admin')
  @ApiOperation({ summary: 'Recalculate metrics' })
  recalculate(@CurrentUser('tenantId') tenantId: string) {
    return this.analyticsService.recalculate(tenantId);
  }
}
