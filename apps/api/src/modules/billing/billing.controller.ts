import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices' })
  getInvoices(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.billingService.getInvoices(tenantId, dto);
  }

  @Post('invoice')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create invoice' })
  createInvoice(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.billingService.createInvoice(tenantId, userId, dto);
  }

  @Post('invoice/issue')
  @Roles('admin')
  @ApiOperation({ summary: 'Issue invoice' })
  issueInvoice(@CurrentUser('tenantId') tenantId: string, @Body() dto: { invoiceId: string }) {
    return this.billingService.issueInvoice(tenantId, dto.invoiceId);
  }

  @Post('invoice/cancel')
  @Roles('admin')
  @ApiOperation({ summary: 'Cancel invoice' })
  cancelInvoice(@CurrentUser('tenantId') tenantId: string, @Body() dto: { invoiceId: string }) {
    return this.billingService.cancelInvoice(tenantId, dto.invoiceId);
  }

  @Get('billing')
  @ApiOperation({ summary: 'List billing rules' })
  getBillings(@CurrentUser('tenantId') tenantId: string) {
    return this.billingService.getBillings(tenantId);
  }

  @Post('billing')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create billing rule' })
  createBilling(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.billingService.createBilling(tenantId, userId, dto);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payments' })
  getPayments(@CurrentUser('tenantId') tenantId: string) {
    return this.billingService.getPayments(tenantId);
  }

  @Post('payments')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create payment' })
  createPayment(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.billingService.createPayment(tenantId, dto);
  }

  @Get('billing-stats')
  @ApiOperation({ summary: 'Billing statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.billingService.getStats(tenantId);
  }
}
