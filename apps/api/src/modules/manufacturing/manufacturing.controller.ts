import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ManufacturingService } from './manufacturing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Manufacturing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class ManufacturingController {
  constructor(private readonly manufacturingService: ManufacturingService) {}

  @Get('manufacturing')
  @ApiOperation({ summary: 'Manufacturing dashboard' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.manufacturingService.getStats(tenantId);
  }

  @Get('bom')
  @ApiOperation({ summary: 'List BOMs' })
  getBOMs(@CurrentUser('tenantId') tenantId: string) {
    return this.manufacturingService.getBOMs(tenantId);
  }

  @Post('bom')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create BOM' })
  createBOM(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.manufacturingService.createBOM(tenantId, userId, dto);
  }

  @Get('production-orders')
  @ApiOperation({ summary: 'List production orders' })
  getProductionOrders(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.manufacturingService.getProductionOrders(tenantId, dto);
  }

  @Post('production-orders')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create production order' })
  createProductionOrder(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.manufacturingService.createProductionOrder(tenantId, userId, dto);
  }

  @Post('production/start')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Start production' })
  startProduction(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.manufacturingService.startProduction(tenantId, dto);
  }

  @Post('production/finish')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Finish production' })
  finishProduction(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.manufacturingService.finishProduction(tenantId, dto);
  }

  @Get('work-centers')
  @ApiOperation({ summary: 'List work centers' })
  getWorkCenters(@CurrentUser('tenantId') tenantId: string) {
    return this.manufacturingService.getWorkCenters(tenantId);
  }

  @Post('work-centers')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create work center' })
  createWorkCenter(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.manufacturingService.createWorkCenter(tenantId, dto);
  }
}
