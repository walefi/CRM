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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto, CompanySettingsDto } from './dto/companies.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'List all companies in tenant' })
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.companiesService.findAll(tenantId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant settings' })
  current(@CurrentUser('tenantId') tenantId: string) {
    return this.companiesService.getSettings(tenantId);
  }

  @Get('current/settings')
  @ApiOperation({ summary: 'Get current tenant settings' })
  currentSettings(@CurrentUser('tenantId') tenantId: string) {
    return this.companiesService.getSettings(tenantId);
  }

  @Patch('current/settings')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @ApiOperation({ summary: 'Update current tenant settings (admin only)' })
  updateCurrentSettings(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CompanySettingsDto,
  ) {
    return this.companiesService.updateSettings(tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.companiesService.findById(id, tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new company (admin only)' })
  @ApiResponse({ status: 201, description: 'Company created' })
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.companiesService.create(tenantId, dto, userId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update company (admin only)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.companiesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete company (admin only)' })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.companiesService.remove(id, tenantId);
  }
}
