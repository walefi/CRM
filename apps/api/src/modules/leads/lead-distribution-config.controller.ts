import { Controller, Get, Put, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeadDistributionConfigService } from './lead-distribution-config.service';
import { UpdateLeadDistributionConfigDto } from './dto/lead-distribution-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Lead Distribution Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('leads/distribution')
export class LeadDistributionConfigController {
  constructor(private readonly configService: LeadDistributionConfigService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get lead distribution configuration' })
  getConfig(@CurrentUser('tenantId') tenantId: string) {
    return this.configService.getConfig(tenantId);
  }

  @Put('config')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update lead distribution configuration (admin)' })
  updateConfig(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateLeadDistributionConfigDto,
  ) {
    return this.configService.updateConfig(tenantId, dto);
  }

  @Get('eligible-users')
  @ApiOperation({ summary: 'Get users eligible for lead distribution' })
  getEligibleUsers(@CurrentUser('tenantId') tenantId: string) {
    return this.configService.getEligibleUsers(tenantId);
  }
}
