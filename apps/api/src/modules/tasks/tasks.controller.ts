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
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  ActivityFilterDto,
  CreateActivityDto,
} from './dto/tasks.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tasks & Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('tasks')
  @ApiOperation({ summary: 'List tasks' })
  findTasks(@CurrentUser('tenantId') tenantId: string, @Query() filters: ActivityFilterDto) {
    return this.tasksService.findAllTasks(tenantId, filters);
  }

  @Get('tasks/stats')
  @ApiOperation({ summary: 'Task statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.tasksService.getStats(tenantId);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task detail' })
  findTask(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.tasksService.findTaskById(id, tenantId);
  }

  @Post('tasks')
  @Roles('admin')
  @ApiOperation({ summary: 'Create task' })
  createTask(
    @Body() dto: CreateTaskDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.createTask(tenantId, dto, userId);
  }

  @Patch('tasks/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update task' })
  updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.tasksService.updateTask(id, tenantId, dto);
  }

  @Delete('tasks/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete task' })
  removeTask(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.tasksService.removeTask(id, tenantId);
  }

  @Post('tasks/:id/complete')
  @ApiOperation({ summary: 'Complete task' })
  completeTask(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.tasksService.completeTask(id, tenantId);
  }

  @Get('activities')
  @ApiOperation({ summary: 'List activities' })
  findActivities(@CurrentUser('tenantId') tenantId: string, @Query() filters: ActivityFilterDto) {
    return this.tasksService.findAllActivities(tenantId, filters);
  }

  @Post('activities')
  @ApiOperation({ summary: 'Create activity' })
  createActivity(
    @Body() dto: CreateActivityDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.createActivity(tenantId, dto, userId);
  }

  // Projects
  @Get('projects')
  @ApiOperation({ summary: 'List projects' })
  getProjects(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.tasksService.getProjects(tenantId, dto);
  }

  @Post('projects')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create project' })
  createProject(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.tasksService.createProject(tenantId, userId, dto);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get project' })
  getProject(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.tasksService.getProject(tenantId, id);
  }

  @Patch('projects/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update project' })
  updateProject(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.tasksService.updateProject(tenantId, id, dto);
  }

  @Delete('projects/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete project' })
  deleteProject(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.tasksService.deleteProject(tenantId, id);
  }

  @Post('dependency')
  @ApiOperation({ summary: 'Create task dependency' })
  createDependency(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.tasksService.createDependency(tenantId, dto);
  }

  @Get('workload')
  @ApiOperation({ summary: 'Get workload distribution' })
  getWorkload(@CurrentUser('tenantId') tenantId: string, @Query('userId') userId?: string) {
    return this.tasksService.getWorkload(tenantId, userId);
  }

  @Get('project-stats')
  @ApiOperation({ summary: 'Project & task statistics' })
  getProjectStats(@CurrentUser('tenantId') tenantId: string) {
    return this.tasksService.getProjectStats(tenantId);
  }
}
