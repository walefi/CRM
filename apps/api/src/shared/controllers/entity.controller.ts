import { Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { EntityService } from '../services/entity.service';
import { SearchDto, BulkActionDto } from '../dto/entity.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

export abstract class EntityController<CreateDto, UpdateDto> {
  constructor(protected readonly service: EntityService<CreateDto, UpdateDto>) {}

  @Get()
  @ApiOperation({ summary: 'List with search, filters and pagination' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() dto: SearchDto) {
    return this.service.findAll(tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get by ID' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.service.findById(id, tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create (admin)' })
  create(
    @Body() dto: CreateDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(tenantId, dto, userId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update (admin)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete (admin)' })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.service.remove(id, tenantId);
  }

  @Post(':id/restore')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore (admin)' })
  restore(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.service.restore(id, tenantId);
  }

  @Post(':id/duplicate')
  @Roles('admin')
  @ApiOperation({ summary: 'Duplicate (admin)' })
  duplicate(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.service.duplicate(id, tenantId);
  }

  @Post(':id/archive')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive (admin)' })
  archive(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.service.archive(id, tenantId);
  }

  @Post('bulk/:action')
  @Roles('admin')
  @ApiOperation({ summary: 'Bulk action (delete/restore/archive)' })
  bulkAction(
    @Param('action') action: string,
    @Body() dto: BulkActionDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.service.bulkAction(tenantId, action, dto);
  }
}
