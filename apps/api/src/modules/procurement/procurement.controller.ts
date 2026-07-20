import {
  Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProcurementService } from './procurement.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Get('suppliers')
  @ApiOperation({ summary: 'List suppliers' })
  getSuppliers(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.procurementService.getSuppliers(tenantId, dto);
  }

  @Post('suppliers')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create supplier' })
  createSupplier(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.procurementService.createSupplier(tenantId, dto);
  }

  @Get('purchase-requests')
  @ApiOperation({ summary: 'List purchase requests' })
  getRequests(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.procurementService.getRequests(tenantId, dto);
  }

  @Post('purchase-requests')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create purchase request' })
  createRequest(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.procurementService.createRequest(tenantId, userId, dto);
  }

  @Get('purchase-orders')
  @ApiOperation({ summary: 'List purchase orders' })
  getOrders(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.procurementService.getOrders(tenantId, dto);
  }

  @Post('purchase-orders')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create purchase order' })
  createOrder(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.procurementService.createOrder(tenantId, userId, dto);
  }

  @Post('purchase-orders/approve')
  @Roles('admin')
  @ApiOperation({ summary: 'Approve purchase order' })
  approveOrder(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: { orderId: string }) {
    return this.procurementService.approveOrder(tenantId, dto.orderId, userId);
  }

  @Get('receiving')
  @ApiOperation({ summary: 'List receivings' })
  getReceivings(@CurrentUser('tenantId') tenantId: string) {
    return this.procurementService.getReceivings(tenantId);
  }

  @Post('receiving')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create receiving' })
  createReceiving(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.procurementService.createReceiving(tenantId, userId, dto);
  }

  @Get('procurement-stats')
  @ApiOperation({ summary: 'Procurement statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.procurementService.getStats(tenantId);
  }
}
