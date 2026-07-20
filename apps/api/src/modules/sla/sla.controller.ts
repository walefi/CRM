import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SlaService } from './sla.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('SLA Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('sla')
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Get()
  @ApiOperation({ summary: 'List SLA rules' })
  getRules(@CurrentUser('tenantId') tenantId: string) {
    return this.slaService.getRules(tenantId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'SLA statistics' })
  getStatistics(@CurrentUser('tenantId') tenantId: string) {
    return this.slaService.getStatistics(tenantId);
  }

  @Get('violations')
  @ApiOperation({ summary: 'List SLA violations' })
  getViolations(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.slaService.getViolations(tenantId, dto);
  }

  @Get('executions')
  @ApiOperation({ summary: 'List SLA executions' })
  getExecutions(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.slaService.getExecutions(tenantId, dto);
  }

  @Get('rules')
  @ApiOperation({ summary: 'List SLA rules' })
  getRulesList(@CurrentUser('tenantId') tenantId: string) {
    return this.slaService.getRules(tenantId);
  }

  @Post('rules')
  @Roles('admin')
  @ApiOperation({ summary: 'Create SLA rule' })
  createRule(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.slaService.createRule(tenantId, dto);
  }

  @Patch('rules/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update SLA rule' })
  updateRule(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.slaService.updateRule(tenantId, id, dto);
  }

  @Delete('rules/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete SLA rule' })
  deleteRule(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.slaService.deleteRule(tenantId, id);
  }

  @Post('check')
  @Roles('admin')
  @ApiOperation({ summary: 'Trigger SLA check' })
  checkExpiring(@CurrentUser('tenantId') tenantId: string) {
    return this.slaService.checkExpiring(tenantId);
  }
}
