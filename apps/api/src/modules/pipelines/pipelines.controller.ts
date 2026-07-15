import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PipelinesService } from './pipelines.service';
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  CreateStageDto,
  UpdateStageDto,
  KanbanMoveDto,
} from './dto/pipelines.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Pipelines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get()
  @ApiOperation({ summary: 'List all pipelines' })
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.pipelinesService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pipeline with stages' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.pipelinesService.findById(id, tenantId);
  }

  @Get(':id/kanban')
  @ApiOperation({ summary: 'Get kanban board (pipeline + stages + deals)' })
  getKanban(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.pipelinesService.getKanban(id, tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create pipeline' })
  create(@Body() dto: CreatePipelineDto, @CurrentUser('tenantId') tenantId: string) {
    return this.pipelinesService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update pipeline' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePipelineDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.pipelinesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete pipeline' })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.pipelinesService.remove(id, tenantId);
  }

  @Post(':id/stages')
  @Roles('admin')
  @ApiOperation({ summary: 'Add stage to pipeline' })
  addStage(
    @Param('id') id: string,
    @Body() dto: CreateStageDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.pipelinesService.addStage(id, tenantId, dto);
  }

  @Patch('stages/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update stage' })
  updateStage(
    @Param('id') id: string,
    @Body() dto: UpdateStageDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.pipelinesService.updateStage(id, tenantId, dto);
  }

  @Delete('stages/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete stage' })
  deleteStage(@Param('id') id: string) {
    return this.pipelinesService.deleteStage(id);
  }

  @Post('kanban/move')
  @ApiOperation({ summary: 'Move deal to another stage (kanban drag)' })
  moveDeal(@Body() dto: KanbanMoveDto, @CurrentUser('tenantId') tenantId: string) {
    return this.pipelinesService.moveDeal(tenantId, dto);
  }
}
