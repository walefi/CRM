import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowFilterDto,
  RunWorkflowDto,
  TestWorkflowDto,
} from './dto/workflows.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List workflows with filters and pagination' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() dto: WorkflowFilterDto) {
    return this.workflowsService.findAll(tenantId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get workflow statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.workflowsService.getStats(tenantId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List workflow templates' })
  getTemplates(@CurrentUser('tenantId') tenantId: string) {
    return this.workflowsService.getTemplates(tenantId);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get recent execution logs' })
  getLogs(@CurrentUser('tenantId') tenantId: string) {
    return this.workflowsService.getLogs(tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new workflow' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.workflowsService.create(tenantId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.workflowsService.findById(id, tenantId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update workflow' })
  update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete workflow' })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.workflowsService.remove(id, tenantId);
  }

  @Post(':id/publish')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish workflow' })
  publish(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workflowsService.publish(id, tenantId, userId);
  }

  @Post(':id/run')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute workflow' })
  run(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RunWorkflowDto,
  ) {
    return this.workflowsService.run(id, tenantId, userId, dto);
  }

  @Post(':id/test')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test workflow without persisting side effects' })
  test(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: TestWorkflowDto,
  ) {
    return this.workflowsService.test(id, tenantId, dto);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get execution history for a workflow' })
  getHistory(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.workflowsService.getHistory(id, tenantId, page || 1, limit || 15);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get version history for a workflow' })
  getVersions(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.workflowsService.getVersions(id, tenantId);
  }
}
