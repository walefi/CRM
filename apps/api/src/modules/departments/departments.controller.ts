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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/departments.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all departments' })
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.departmentsService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.departmentsService.findById(id, tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create department (admin)' })
  create(@Body() dto: CreateDepartmentDto, @CurrentUser('tenantId') tenantId: string) {
    return this.departmentsService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update department (admin)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.departmentsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete department (admin)' })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.departmentsService.remove(id, tenantId);
  }
}
