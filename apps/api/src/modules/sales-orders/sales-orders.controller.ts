import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesOrdersService } from './sales-orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('SalesOrders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List sales orders' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.salesOrdersService.getOrders(tenantId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Sales order statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.salesOrdersService.getStats(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create sales order' })
  create(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.salesOrdersService.createOrder(tenantId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales order' })
  findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.salesOrdersService.getOrder(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sales order' })
  update(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.salesOrdersService.updateOrder(tenantId, id, userId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete sales order' })
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.salesOrdersService.deleteOrder(tenantId, id);
  }

  @Post('convert')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Convert quote to sales order' })
  convert(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.salesOrdersService.convertFromQuote(tenantId, userId, dto);
  }

  @Post('approve')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Approve sales order' })
  approve(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: { orderId: string }) {
    return this.salesOrdersService.approveOrder(tenantId, dto.orderId, userId);
  }

  @Post('cancel')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Cancel sales order' })
  cancel(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: { orderId: string }) {
    return this.salesOrdersService.cancelOrder(tenantId, dto.orderId, userId);
  }
}
