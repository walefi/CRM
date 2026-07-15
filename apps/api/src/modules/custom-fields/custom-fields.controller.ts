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
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CustomFieldValueDto,
} from './dto/custom-fields.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Custom Fields')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  @ApiOperation({ summary: 'List custom fields, optionally filtered by entity' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query('entity') entity?: string) {
    return this.customFieldsService.findAll(tenantId, entity);
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get custom field groups for an entity' })
  getGroups(@CurrentUser('tenantId') tenantId: string, @Query('entity') entity: string) {
    return this.customFieldsService.getGroups(tenantId, entity);
  }

  @Get('entity/:entity')
  @ApiOperation({ summary: 'Get active custom fields for an entity (for dynamic forms)' })
  findByEntity(@CurrentUser('tenantId') tenantId: string, @Param('entity') entity: string) {
    return this.customFieldsService.findByEntity(tenantId, entity);
  }

  @Get('values/:entity/:entityId')
  @ApiOperation({ summary: 'Get custom field values for an entity record' })
  getValues(@Param('entity') entity: string, @Param('entityId') entityId: string) {
    return this.customFieldsService.getValues(entity, entityId);
  }

  @Post('values')
  @ApiOperation({ summary: 'Save custom field values for an entity record' })
  saveValues(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { entity: string; entityId: string; values: CustomFieldValueDto[] },
  ) {
    return this.customFieldsService.saveValues(tenantId, body.entity, body.entityId, body.values);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get custom field by ID' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.customFieldsService.findById(id, tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create custom field (admin)' })
  create(@Body() dto: CreateCustomFieldDto, @CurrentUser('tenantId') tenantId: string) {
    return this.customFieldsService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update custom field (admin)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customFieldsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete custom field (admin)' })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.customFieldsService.remove(id, tenantId);
  }
}
