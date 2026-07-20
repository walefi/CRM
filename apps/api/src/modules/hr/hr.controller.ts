import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('HR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('employees')
  @ApiOperation({ summary: 'List employees' })
  getEmployees(@CurrentUser('tenantId') tenantId: string) {
    return this.hrService.getEmployees(tenantId);
  }

  @Get('skills')
  @ApiOperation({ summary: 'List skills' })
  getSkills(@CurrentUser('tenantId') tenantId: string, @Query('userId') userId?: string) {
    return this.hrService.getSkills(tenantId, userId);
  }

  @Post('skills')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create skill' })
  createSkill(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.hrService.createSkill(tenantId, dto);
  }

  @Get('allocations')
  @ApiOperation({ summary: 'List resource allocations' })
  getAllocations(@CurrentUser('tenantId') tenantId: string, @Query('userId') userId?: string) {
    return this.hrService.getAllocations(tenantId, userId);
  }

  @Post('allocations')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create allocation' })
  createAllocation(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.hrService.createAllocation(tenantId, dto);
  }

  @Get('vacations')
  @ApiOperation({ summary: 'List vacations' })
  getVacations(@CurrentUser('tenantId') tenantId: string, @Query('userId') userId?: string) {
    return this.hrService.getVacations(tenantId, userId);
  }

  @Post('vacations')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Request vacation' })
  requestVacation(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.hrService.requestVacation(tenantId, dto);
  }

  @Get('leaves')
  @ApiOperation({ summary: 'List leave requests' })
  getLeaves(@CurrentUser('tenantId') tenantId: string) {
    return this.hrService.getLeaves(tenantId);
  }

  @Post('leaves')
  @ApiOperation({ summary: 'Request leave' })
  requestLeave(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.hrService.requestLeave(tenantId, dto);
  }

  @Get('performance')
  @ApiOperation({ summary: 'List performance reviews' })
  getReviews(@CurrentUser('tenantId') tenantId: string, @Query('userId') userId?: string) {
    return this.hrService.getReviews(tenantId, userId);
  }

  @Post('performance')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create review' })
  createReview(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.hrService.createReview(tenantId, dto);
  }

  @Get('trainings')
  @ApiOperation({ summary: 'List trainings' })
  getTrainings(@CurrentUser('tenantId') tenantId: string) {
    return this.hrService.getTrainings(tenantId);
  }

  @Post('trainings')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create training' })
  createTraining(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.hrService.createTraining(tenantId, userId, dto);
  }

  @Get('departments')
  @ApiOperation({ summary: 'List departments' })
  getDepartments(@CurrentUser('tenantId') tenantId: string) {
    return this.hrService.getDepartments(tenantId);
  }

  @Get('teams')
  @ApiOperation({ summary: 'List teams' })
  getTeams(@CurrentUser('tenantId') tenantId: string) {
    return this.hrService.getTeams(tenantId);
  }

  @Get('hr-stats')
  @ApiOperation({ summary: 'HR statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.hrService.getStats(tenantId);
  }
}
