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
import { AutomationsService } from './automations.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  AutomationFilterDto,
  RunAutomationDto,
  TestAutomationDto,
  CreateAutomationTemplateDto,
} from './dto/automations.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('automations')
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List automations with filters and pagination' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() dto: AutomationFilterDto) {
    return this.automationsService.findAll(tenantId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get automation dashboard statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.automationsService.getStats(tenantId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List automation templates' })
  getTemplates(@CurrentUser('tenantId') tenantId: string) {
    return this.automationsService.getTemplates(tenantId);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get automation execution logs' })
  getLogs(
    @CurrentUser('tenantId') tenantId: string,
    @Query('automationId') automationId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.automationsService.getLogs(tenantId, automationId, page || 1, limit || 50);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get automation execution history' })
  getHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Query('automationId') automationId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.automationsService.getHistory(tenantId, automationId, page || 1, limit || 15);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new automation' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAutomationDto,
  ) {
    return this.automationsService.create(tenantId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get automation by ID' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.automationsService.findById(id, tenantId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update automation' })
  update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automationsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete automation' })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.automationsService.remove(id, tenantId);
  }

  @Post(':id/publish')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish automation (set to ACTIVE)' })
  publish(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.automationsService.publish(id, tenantId, userId);
  }

  @Post(':id/duplicate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deep clone an automation with all relations' })
  duplicate(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.automationsService.duplicate(id, tenantId, userId);
  }

  @Post(':id/run')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute automation' })
  run(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RunAutomationDto,
  ) {
    return this.automationsService.run(id, tenantId, userId, dto);
  }

  @Post(':id/test')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test automation without persisting side effects' })
  test(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: TestAutomationDto,
  ) {
    return this.automationsService.test(id, tenantId, dto);
  }

  @Post('templates')
  @Roles('admin')
  @ApiOperation({ summary: 'Create automation template' })
  createTemplate(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAutomationTemplateDto,
  ) {
    return this.automationsService.createTemplate(tenantId, userId, dto);
  }

  @Post('templates/:templateId/use')
  @Roles('admin')
  @ApiOperation({ summary: 'Create automation from template' })
  createFromTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.automationsService.createFromTemplate(tenantId, userId, templateId);
  }

  @Post('run')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute automation by providing automationId in body' })
  runAny(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RunAutomationDto,
  ) {
    const { automationId, ...rest } = dto;
    if (!automationId) throw new Error('automationId is required');
    return this.automationsService.run(automationId, tenantId, userId, rest);
  }

  @Post('test')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test automation by providing automationId in body' })
  testAny(@CurrentUser('tenantId') tenantId: string, @Body() dto: TestAutomationDto) {
    const { automationId, ...rest } = dto;
    if (!automationId) throw new Error('automationId is required');
    return this.automationsService.test(automationId, tenantId, rest);
  }
}
