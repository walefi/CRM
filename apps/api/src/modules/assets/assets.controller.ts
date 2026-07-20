import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('assets')
  @ApiOperation({ summary: 'List assets' })
  getAssets(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.assetsService.getAssets(tenantId, dto);
  }

  @Get('assets/stats')
  @ApiOperation({ summary: 'Asset statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.assetsService.getStats(tenantId);
  }

  @Post('assets')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create asset' })
  createAsset(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.assetsService.createAsset(tenantId, dto);
  }

  @Get('assets/:id')
  @ApiOperation({ summary: 'Get asset details' })
  getAsset(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.assetsService.getAsset(tenantId, id);
  }

  @Patch('assets/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update asset' })
  updateAsset(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.assetsService.updateAsset(tenantId, id, dto);
  }

  @Delete('assets/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete asset' })
  deleteAsset(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.assetsService.deleteAsset(tenantId, id);
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'List maintenance plans' })
  getMaintenance(@CurrentUser('tenantId') tenantId: string, @Query('assetId') assetId?: string) {
    return this.assetsService.getMaintenance(tenantId, assetId);
  }

  @Post('maintenance')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create maintenance plan' })
  createMaintenance(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.assetsService.createMaintenance(tenantId, dto);
  }

  @Get('work-orders')
  @ApiOperation({ summary: 'List work orders' })
  getWorkOrders(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.assetsService.getWorkOrders(tenantId, dto);
  }

  @Post('work-orders')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create work order' })
  createWorkOrder(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.assetsService.createWorkOrder(tenantId, userId, dto);
  }

  @Get('inspections')
  @ApiOperation({ summary: 'List inspections' })
  getInspections(@CurrentUser('tenantId') tenantId: string, @Query('assetId') assetId?: string) {
    return this.assetsService.getInspections(tenantId, assetId);
  }

  @Post('inspections')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create inspection' })
  createInspection(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.assetsService.createInspection(tenantId, dto);
  }
}
