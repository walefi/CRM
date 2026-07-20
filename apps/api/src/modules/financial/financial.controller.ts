import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Financial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Get('financial')
  @ApiOperation({ summary: 'List financial transactions' })
  getTransactions(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.financialService.getTransactions(tenantId, dto);
  }

  @Post('financial')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create transaction' })
  createTransaction(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.financialService.createTransaction(tenantId, userId, dto);
  }

  @Get('financial-stats')
  @ApiOperation({ summary: 'Financial statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.financialService.getStats(tenantId);
  }

  @Get('receivables')
  @ApiOperation({ summary: 'List receivables' })
  getReceivables(@CurrentUser('tenantId') tenantId: string) {
    return this.financialService.getReceivables(tenantId);
  }

  @Post('receivables')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create receivable' })
  createReceivable(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.financialService.createReceivable(tenantId, userId, dto);
  }

  @Post('receipts')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Record receipt' })
  recordReceipt(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.financialService.recordReceipt(tenantId, dto);
  }

  @Get('payables')
  @ApiOperation({ summary: 'List payables' })
  getPayables(@CurrentUser('tenantId') tenantId: string) {
    return this.financialService.getPayables(tenantId);
  }

  @Post('payables')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create payable' })
  createPayable(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.financialService.createPayable(tenantId, userId, dto);
  }

  @Post('payments')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Record payment' })
  recordPayment(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.financialService.recordPayment(tenantId, dto);
  }

  @Get('cashflow')
  @ApiOperation({ summary: 'Get cash flow' })
  getCashFlow(@CurrentUser('tenantId') tenantId: string, @Query('period') period?: string) {
    return this.financialService.getCashFlow(tenantId, period);
  }

  @Post('cashflow')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create cash movement' })
  createCashMovement(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.financialService.createCashMovement(tenantId, dto);
  }
}
