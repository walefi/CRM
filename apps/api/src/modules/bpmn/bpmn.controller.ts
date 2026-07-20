import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BpmnService } from './bpmn.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('BPMN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class BpmnController {
  constructor(private readonly bpmnService: BpmnService) {}

  @Get('rules')
  @ApiOperation({ summary: 'List business rules' })
  getRules(@CurrentUser('tenantId') tenantId: string) {
    return this.bpmnService.getRules(tenantId);
  }

  @Post('rule')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create business rule' })
  createRule(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.bpmnService.createRule(tenantId, userId, dto);
  }

  @Get('approvals')
  @ApiOperation({ summary: 'List approval flows' })
  getApprovals(@CurrentUser('tenantId') tenantId: string) {
    return this.bpmnService.getApprovals(tenantId);
  }

  @Post('approval')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create approval flow' })
  createApproval(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.bpmnService.createApproval(tenantId, userId, dto);
  }

  @Get('processes')
  @ApiOperation({ summary: 'List process definitions' })
  getProcesses(@CurrentUser('tenantId') tenantId: string) {
    return this.bpmnService.getProcesses(tenantId);
  }

  @Post('processes')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create process definition' })
  createProcess(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.bpmnService.createProcess(tenantId, userId, dto);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'List human tasks' })
  getTasks(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.bpmnService.getTasks(tenantId, dto);
  }

  @Post('tasks')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create human task' })
  createTask(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.bpmnService.createTask(tenantId, userId, dto);
  }

  @Post('tasks/complete')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Complete human task' })
  completeTask(@CurrentUser('tenantId') tenantId: string, @Body() dto: { taskId: string }) {
    return this.bpmnService.completeTask(tenantId, dto.taskId);
  }

  @Get('bpmn-stats')
  @ApiOperation({ summary: 'BPMN statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.bpmnService.getStats(tenantId);
  }
}
