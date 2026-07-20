import {
  Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('items')
  @ApiOperation({ summary: 'List inventory items' })
  getItems(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.inventoryService.getItems(tenantId, dto);
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'List warehouses' })
  getWarehouses(@CurrentUser('tenantId') tenantId: string) {
    return this.inventoryService.getWarehouses(tenantId);
  }

  @Get('warehouses/:id')
  @ApiOperation({ summary: 'Get warehouse details' })
  getWarehouse(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.inventoryService.getWarehouse(tenantId, id);
  }

  @Get('movements')
  @ApiOperation({ summary: 'List stock movements' })
  getMovements(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.inventoryService.getMovements(tenantId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Inventory statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.inventoryService.getStats(tenantId);
  }

  @Post('movement')
  @ApiOperation({ summary: 'Create stock movement' })
  createMovement(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.inventoryService.createMovement(tenantId, dto);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Create inventory adjustment' })
  adjust(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.inventoryService.createAdjustment(tenantId, dto);
  }
}
