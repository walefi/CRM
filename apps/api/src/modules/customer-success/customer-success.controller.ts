import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerSuccessService } from './customer-success.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('CustomerSuccess')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class CustomerSuccessController {
  constructor(private readonly csService: CustomerSuccessService) {}

  @Get('customer-success')
  @ApiOperation({ summary: 'Customer success dashboard' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.csService.getStats(tenantId);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List subscriptions' })
  getSubscriptions(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.csService.getSubscriptions(tenantId, dto);
  }

  @Post('subscriptions')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create subscription' })
  createSubscription(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.csService.createSubscription(tenantId, userId, dto);
  }

  @Get('renewals')
  @ApiOperation({ summary: 'List renewals' })
  getRenewals(@CurrentUser('tenantId') tenantId: string) {
    return this.csService.getRenewals(tenantId);
  }

  @Post('renewals')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create renewal' })
  createRenewal(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.csService.createRenewal(tenantId, userId, dto);
  }

  @Get('health')
  @ApiOperation({ summary: 'Get customer health' })
  getHealth(@CurrentUser('tenantId') tenantId: string, @Query('companyId') companyId?: string) {
    return this.csService.getHealth(tenantId, companyId);
  }

  @Post('health/recalculate')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Recalculate health score' })
  recalculateHealth(@CurrentUser('tenantId') tenantId: string, @Body() dto: { companyId: string }) {
    return this.csService.recalculateHealth(tenantId, dto.companyId);
  }

  @Get('journey')
  @ApiOperation({ summary: 'Get customer journey' })
  getJourney(@CurrentUser('tenantId') tenantId: string, @Query('companyId') companyId?: string) {
    return this.csService.getJourney(tenantId, companyId);
  }

  @Get('nps')
  @ApiOperation({ summary: 'Get NPS responses' })
  getNPS(@CurrentUser('tenantId') tenantId: string) {
    return this.csService.getNPS(tenantId);
  }

  @Post('nps')
  @ApiOperation({ summary: 'Submit NPS response' })
  submitNPS(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.csService.submitNPS(tenantId, dto);
  }

  @Post('onboarding')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create onboarding plan' })
  createOnboarding(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.csService.createOnboarding(tenantId, userId, dto);
  }
}
