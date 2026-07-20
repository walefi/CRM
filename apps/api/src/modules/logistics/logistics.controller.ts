import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LogisticsService } from './logistics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Logistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Get('shipments')
  @ApiOperation({ summary: 'List shipments' })
  getShipments(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.logisticsService.getShipments(tenantId, dto);
  }

  @Post('shipping')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create shipment' })
  createShipment(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.logisticsService.createShipment(tenantId, userId, dto);
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'List deliveries' })
  getDeliveries(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.logisticsService.getDeliveries(tenantId, dto);
  }

  @Post('delivery')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create delivery' })
  createDelivery(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.logisticsService.createDelivery(tenantId, dto);
  }

  @Post('proof-of-delivery')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Submit POD' })
  submitPOD(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.logisticsService.submitPOD(tenantId, dto);
  }

  @Get('carriers')
  @ApiOperation({ summary: 'List carriers' })
  getCarriers(@CurrentUser('tenantId') tenantId: string) {
    return this.logisticsService.getCarriers(tenantId);
  }

  @Post('carriers')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create carrier' })
  createCarrier(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.logisticsService.createCarrier(tenantId, dto);
  }

  @Get('picking')
  @ApiOperation({ summary: 'List picking orders' })
  getPicking(@CurrentUser('tenantId') tenantId: string) {
    return this.logisticsService.getPicking(tenantId);
  }

  @Post('picking')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create picking order' })
  createPicking(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.logisticsService.createPicking(tenantId, dto);
  }

  @Get('logistics-stats')
  @ApiOperation({ summary: 'Logistics statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.logisticsService.getStats(tenantId);
  }
}
