import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QualityService } from './quality.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Quality')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Get('quality')
  @ApiOperation({ summary: 'Quality dashboard' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.qualityService.getStats(tenantId);
  }

  @Get('non-conformities')
  @ApiOperation({ summary: 'List non-conformities' })
  getNCs(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.qualityService.getNonConformities(tenantId, dto);
  }

  @Post('non-conformity')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create non-conformity' })
  createNC(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.qualityService.createNonConformity(tenantId, userId, dto);
  }

  @Get('capa')
  @ApiOperation({ summary: 'List CAPAs' })
  getCAPAs(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.qualityService.getCAPAs(tenantId, dto);
  }

  @Post('capa')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create CAPA' })
  createCAPA(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.qualityService.createCAPA(tenantId, userId, dto);
  }

  @Get('audits')
  @ApiOperation({ summary: 'List quality audits' })
  getAudits(@CurrentUser('tenantId') tenantId: string) {
    return this.qualityService.getAudits(tenantId);
  }

  @Post('audit')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create audit' })
  createAudit(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.qualityService.createAudit(tenantId, userId, dto);
  }
}
