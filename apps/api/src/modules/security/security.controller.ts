import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('identity/policies')
  @ApiOperation({ summary: 'List security policies' })
  getPolicies(@CurrentUser('tenantId') tenantId: string) {
    return this.securityService.getPolicies(tenantId);
  }

  @Post('identity/policies')
  @Roles('admin')
  @ApiOperation({ summary: 'Create security policy' })
  createPolicy(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.securityService.createPolicy(tenantId, userId, dto);
  }

  @Get('identity/secrets')
  @ApiOperation({ summary: 'List secrets' })
  getSecrets(@CurrentUser('tenantId') tenantId: string) {
    return this.securityService.getSecrets(tenantId);
  }

  @Post('identity/secret')
  @Roles('admin')
  @ApiOperation({ summary: 'Create secret' })
  createSecret(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.securityService.createSecret(tenantId, userId, dto);
  }

  @Get('identity/incidents')
  @ApiOperation({ summary: 'List security incidents' })
  getIncidents(@CurrentUser('tenantId') tenantId: string) {
    return this.securityService.getIncidents(tenantId);
  }

  @Post('identity/incidents')
  @Roles('admin')
  @ApiOperation({ summary: 'Create incident' })
  createIncident(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.securityService.createIncident(tenantId, dto);
  }

  @Get('identity/compliance')
  @ApiOperation({ summary: 'List compliance audits' })
  getCompliance(@CurrentUser('tenantId') tenantId: string) {
    return this.securityService.getCompliance(tenantId);
  }

  @Post('identity/compliance')
  @Roles('admin')
  @ApiOperation({ summary: 'Create compliance audit' })
  createCompliance(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.securityService.createCompliance(tenantId, userId, dto);
  }

  @Get('identity/audit')
  @ApiOperation({ summary: 'Get audit logs' })
  getAudit(@CurrentUser('tenantId') tenantId: string, @Query('page') page?: number) {
    return this.securityService.getAudit(tenantId, page);
  }

  @Get('identity/stats')
  @ApiOperation({ summary: 'Security statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.securityService.getStats(tenantId);
  }
}
