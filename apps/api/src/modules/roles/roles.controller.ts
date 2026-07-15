import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/roles.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles as RolesDecorator } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles' })
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.findById(id, tenantId);
  }

  @Post()
  @RolesDecorator('admin')
  @ApiOperation({ summary: 'Create role (admin)' })
  create(@Body() dto: CreateRoleDto, @CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.create(tenantId, dto);
  }

  @Patch(':id')
  @RolesDecorator('admin')
  @ApiOperation({ summary: 'Update role (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto, @CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @RolesDecorator('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role (admin)' })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.remove(id, tenantId);
  }
}
