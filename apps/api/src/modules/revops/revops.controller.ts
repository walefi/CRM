import {
  Controller, Get, Post, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RevopsService } from './revops.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('RevOps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class RevopsController {
  constructor(private readonly revopsService: RevopsService) {}

  @Get('sales/commissions')
  @ApiOperation({ summary: 'List commission plans' })
  getCommissions(@CurrentUser('tenantId') tenantId: string) {
    return this.revopsService.getCommissions(tenantId);
  }

  @Post('sales/commission')
  @Roles('admin')
  @ApiOperation({ summary: 'Create commission plan' })
  createCommission(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.revopsService.createCommission(tenantId, userId, dto);
  }

  @Get('sales/forecasts')
  @ApiOperation({ summary: 'List sales forecasts' })
  getForecasts(@CurrentUser('tenantId') tenantId: string) {
    return this.revopsService.getForecasts(tenantId);
  }

  @Post('sales/forecast')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create forecast' })
  createForecast(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.revopsService.createForecast(tenantId, userId, dto);
  }

  @Get('sales/territories')
  @ApiOperation({ summary: 'List territories' })
  getTerritories(@CurrentUser('tenantId') tenantId: string) {
    return this.revopsService.getTerritories(tenantId);
  }

  @Post('sales/territory')
  @Roles('admin')
  @ApiOperation({ summary: 'Create territory' })
  createTerritory(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.revopsService.createTerritory(tenantId, dto);
  }

  @Get('sales/stats')
  @ApiOperation({ summary: 'Sales RevOps statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.revopsService.getStats(tenantId);
  }
}
