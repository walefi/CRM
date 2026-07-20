import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DevopsService } from './devops.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('DevOps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class DevopsController {
  constructor(private readonly devopsService: DevopsService) {}

  @Get('pipelines')
  @ApiOperation({ summary: 'List CI/CD pipelines' })
  getPipelines(@CurrentUser('tenantId') tenantId: string) {
    return this.devopsService.getPipelines(tenantId);
  }

  @Post('pipeline/run')
  @Roles('admin')
  @ApiOperation({ summary: 'Run pipeline' })
  runPipeline(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.devopsService.runPipeline(tenantId, dto);
  }

  @Get('deployments')
  @ApiOperation({ summary: 'List deployments' })
  getDeployments(@CurrentUser('tenantId') tenantId: string) {
    return this.devopsService.getDeployments(tenantId);
  }

  @Post('deployment')
  @Roles('admin')
  @ApiOperation({ summary: 'Create deployment' })
  createDeployment(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.devopsService.createDeployment(tenantId, userId, dto);
  }

  @Post('rollback')
  @Roles('admin')
  @ApiOperation({ summary: 'Rollback deployment' })
  rollback(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.devopsService.rollback(tenantId, dto);
  }

  @Get('feature-flags')
  @ApiOperation({ summary: 'List feature flags' })
  getFeatureFlags(@CurrentUser('tenantId') tenantId: string) {
    return this.devopsService.getFeatureFlags(tenantId);
  }

  @Post('feature-flag')
  @Roles('admin')
  @ApiOperation({ summary: 'Toggle feature flag' })
  toggleFeatureFlag(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.devopsService.toggleFeatureFlag(tenantId, dto);
  }

  @Get('releases')
  @ApiOperation({ summary: 'List releases' })
  getReleases(@CurrentUser('tenantId') tenantId: string) {
    return this.devopsService.getReleases(tenantId);
  }

  @Get('devops-stats')
  @ApiOperation({ summary: 'DevOps statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.devopsService.getStats(tenantId);
  }
}
