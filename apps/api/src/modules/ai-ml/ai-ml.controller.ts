import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiMlService } from './ai-ml.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI-ML')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class AiMlController {
  constructor(private readonly aiMlService: AiMlService) {}

  @Get('ai/models')
  @ApiOperation({ summary: 'List AI models' })
  getModels(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.aiMlService.getModels(tenantId, dto);
  }

  @Post('ai/models')
  @Roles('admin')
  @ApiOperation({ summary: 'Create AI model' })
  createModel(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.aiMlService.createModel(tenantId, userId, dto);
  }

  @Post('ai/train')
  @Roles('admin')
  @ApiOperation({ summary: 'Train AI model' })
  trainModel(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.aiMlService.trainModel(tenantId, dto);
  }

  @Post('ai/inference')
  @ApiOperation({ summary: 'Run inference' })
  runInference(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.aiMlService.runInference(tenantId, userId, dto);
  }

  @Get('ai/predictions')
  @ApiOperation({ summary: 'List predictions' })
  getPredictions(@CurrentUser('tenantId') tenantId: string) {
    return this.aiMlService.getPredictions(tenantId);
  }

  @Get('ai/features')
  @ApiOperation({ summary: 'List feature store' })
  getFeatures(@CurrentUser('tenantId') tenantId: string) {
    return this.aiMlService.getFeatures(tenantId);
  }

  @Post('ai/features')
  @Roles('admin')
  @ApiOperation({ summary: 'Create/update feature' })
  createFeature(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.aiMlService.createFeature(tenantId, dto);
  }

  @Get('ai/registry')
  @ApiOperation({ summary: 'Model registry' })
  getRegistry(@CurrentUser('tenantId') tenantId: string) {
    return this.aiMlService.getRegistry(tenantId);
  }

  @Get('ai/ml-stats')
  @ApiOperation({ summary: 'AI/ML statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.aiMlService.getStats(tenantId);
  }
}
