import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CxService } from './cx.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('CX')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class CxController {
  constructor(private readonly cxService: CxService) {}

  @Get('cx/conversations')
  @ApiOperation({ summary: 'List CX conversations' })
  getConversations(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.cxService.getConversations(tenantId, dto);
  }

  @Get('cx/channels')
  @ApiOperation({ summary: 'List channels' })
  getChannels(@CurrentUser('tenantId') tenantId: string) {
    return this.cxService.getChannels(tenantId);
  }

  @Post('cx/channel')
  @Roles('admin')
  @ApiOperation({ summary: 'Connect channel' })
  connectChannel(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.cxService.connectChannel(tenantId, dto);
  }

  @Get('cx/queues')
  @ApiOperation({ summary: 'List queues' })
  getQueues(@CurrentUser('tenantId') tenantId: string) {
    return this.cxService.getQueues(tenantId);
  }

  @Get('cx/agents')
  @ApiOperation({ summary: 'List agents' })
  getAgents(@CurrentUser('tenantId') tenantId: string) {
    return this.cxService.getAgents(tenantId);
  }

  @Post('cx/agent-status')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Set agent status' })
  setAgentStatus(@CurrentUser('tenantId') tenantId: string, @Body() dto: { userId: string; status: string }) {
    return this.cxService.setAgentStatus(tenantId, dto.userId, dto.status);
  }

  @Get('cx/journeys')
  @ApiOperation({ summary: 'List customer journeys' })
  getJourneys(@CurrentUser('tenantId') tenantId: string) {
    return this.cxService.getJourneys(tenantId);
  }

  @Get('cx/sla')
  @ApiOperation({ summary: 'List SLA policies' })
  getSLA(@CurrentUser('tenantId') tenantId: string) {
    return this.cxService.getSLA(tenantId);
  }

  @Post('cx/sla')
  @Roles('admin')
  @ApiOperation({ summary: 'Create SLA policy' })
  createSLA(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.cxService.createSLA(tenantId, dto);
  }

  @Get('cx/stats')
  @ApiOperation({ summary: 'CX statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.cxService.getStats(tenantId);
  }
}
