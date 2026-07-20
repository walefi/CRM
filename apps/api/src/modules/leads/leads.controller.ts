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
import { LeadsService } from './leads.service';
import { LeadDistributionService } from './lead-distribution.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  LeadFilterDto,
  ConvertLeadDto,
  AssignLeadDto,
} from './dto/leads.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly distributionService: LeadDistributionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List leads with filters and pagination' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() filters: LeadFilterDto) {
    return this.leadsService.findAll(tenantId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get leads statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.leadsService.getStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.leadsService.findById(id, tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create lead' })
  create(
    @Body() dto: CreateLeadDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leadsService.create(tenantId, dto, userId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update lead' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.leadsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete lead' })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.leadsService.remove(id, tenantId);
  }

  @Post(':id/restore')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore lead' })
  restore(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.leadsService.restore(id, tenantId);
  }

  @Post(':id/convert')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert lead to contact, company or deal' })
  convert(
    @Param('id') id: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leadsService.convert(tenantId, id, dto, userId);
  }

  @Post(':id/assign')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually assign lead to a user' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignLeadDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.distributionService.assignManual(
      tenantId,
      id,
      dto.userId,
      userId,
      dto.reason,
    );
  }
}
