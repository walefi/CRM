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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import {
  CreateReportDto,
  UpdateReportDto,
  ReportFilterDto,
  RunReportDto,
  ExportReportDto,
  CreateScheduleDto,
  CreateTemplateDto,
} from './dto/reports.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'List reports' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() dto: ReportFilterDto) {
    return this.reportsService.findAll(tenantId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Report statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.reportsService.getStats(tenantId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Execution history' })
  getHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Query('reportId') reportId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getHistory(tenantId, reportId, page, limit);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List report templates' })
  getTemplates(@CurrentUser('tenantId') tenantId: string, @Query('category') category?: string) {
    return this.reportsService.getTemplates(tenantId, category);
  }

  @Get('schedules')
  @ApiOperation({ summary: 'List report schedules' })
  getSchedules(@CurrentUser('tenantId') tenantId: string, @Query('reportId') reportId?: string) {
    return this.reportsService.getSchedules(tenantId, reportId);
  }

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create report' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(tenantId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by ID' })
  findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.reportsService.findById(tenantId, id);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update report' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.reportsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete report' })
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.reportsService.remove(tenantId, id);
  }

  @Post('run')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Execute report' })
  run(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RunReportDto & { reportId: string },
  ) {
    return this.reportsService.run(tenantId, dto.reportId, userId, dto);
  }

  @Post('export')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Export report' })
  export(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ExportReportDto & { reportId: string },
  ) {
    return this.reportsService.export(tenantId, dto.reportId, dto);
  }

  @Post('schedule')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Schedule report' })
  createSchedule(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateScheduleDto & { reportId: string },
  ) {
    return this.reportsService.createSchedule(tenantId, dto.reportId, dto);
  }

  @Delete('schedule/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete schedule' })
  deleteSchedule(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.reportsService.deleteSchedule(tenantId, id);
  }

  @Post('templates')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create template' })
  createTemplate(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.reportsService.createTemplate(tenantId, userId, dto);
  }
}
