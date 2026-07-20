import {
  Controller, Get, Post, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BiService } from './bi.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('BI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class BiController {
  constructor(private readonly biService: BiService) {}

  @Get('bi')
  @ApiOperation({ summary: 'BI overview' })
  getOverview(@CurrentUser('tenantId') tenantId: string) {
    return this.biService.getOverview(tenantId);
  }

  @Get('bi-stats')
  @ApiOperation({ summary: 'BI statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.biService.getStats(tenantId);
  }

  @Get('pipelines')
  @ApiOperation({ summary: 'List data pipelines' })
  getPipelines(@CurrentUser('tenantId') tenantId: string) {
    return this.biService.getPipelines(tenantId);
  }

  @Post('etl/run')
  @Roles('admin')
  @ApiOperation({ summary: 'Run ETL pipeline' })
  runPipeline(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.biService.runPipeline(tenantId, dto);
  }

  @Get('warehouse')
  @ApiOperation({ summary: 'List data sources' })
  getDataSources(@CurrentUser('tenantId') tenantId: string) {
    return this.biService.getDataSources(tenantId);
  }

  @Post('warehouse')
  @Roles('admin')
  @ApiOperation({ summary: 'Create data source' })
  createDataSource(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.biService.createDataSource(tenantId, dto);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'List business metrics' })
  getMetrics(@CurrentUser('tenantId') tenantId: string) {
    return this.biService.getMetrics(tenantId);
  }

  @Post('metric')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create business metric' })
  createMetric(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.biService.createMetric(tenantId, dto);
  }

  @Get('dashboards')
  @ApiOperation({ summary: 'List BI dashboards' })
  getDashboards(@CurrentUser('tenantId') tenantId: string) {
    return this.biService.getDashboards(tenantId);
  }

  @Post('dashboard')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create BI dashboard' })
  createDashboard(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.biService.createDashboard(tenantId, userId, dto);
  }

  @Post('query')
  @ApiOperation({ summary: 'Run analytical query' })
  runQuery(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.biService.runQuery(tenantId, userId, dto);
  }
}
