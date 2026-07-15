import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Customer portal dashboard' })
  getDashboard(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.portalService.getDashboard(tenantId, userId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get profile' })
  getProfile(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.portalService.getProfile(tenantId, userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update profile' })
  updateProfile(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.portalService.updateProfile(tenantId, userId, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Customer tickets' })
  getTickets(@CurrentUser('tenantId') tenantId: string, @Query('page') page?: number) {
    return this.portalService.getPortalTickets(tenantId, page);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Customer documents' })
  getDocuments(@CurrentUser('tenantId') tenantId: string, @Query('page') page?: number) {
    return this.portalService.getPortalDocuments(tenantId, page);
  }

  @Get('contracts')
  @ApiOperation({ summary: 'Customer contracts' })
  getContracts(@CurrentUser('tenantId') tenantId: string, @Query('page') page?: number) {
    return this.portalService.getPortalContracts(tenantId, page);
  }

  @Get('proposals')
  @ApiOperation({ summary: 'Customer proposals' })
  getQuotes(@CurrentUser('tenantId') tenantId: string, @Query('page') page?: number) {
    return this.portalService.getPortalQuotes(tenantId, page);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Portal notifications' })
  getNotifications(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
  ) {
    return this.portalService.getNotifications(tenantId, userId, page);
  }
}
