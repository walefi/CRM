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
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealDto, DealFilterDto } from './dto/deals.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  @ApiOperation({ summary: 'List deals with filters and pagination' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() filters: DealFilterDto) {
    return this.dealsService.findAll(tenantId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get deals statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.dealsService.getStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deal with relations and notes' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.dealsService.findById(id, tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create deal' })
  create(
    @Body() dto: CreateDealDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dealsService.create(tenantId, dto, userId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update deal' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDealDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.dealsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete deal' })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.dealsService.remove(id, tenantId);
  }

  @Post(':id/duplicate')
  @Roles('admin')
  @ApiOperation({ summary: 'Duplicate deal' })
  duplicate(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.dealsService.duplicate(id, tenantId);
  }

  @Post('convert/:leadId')
  @Roles('admin')
  @ApiOperation({ summary: 'Convert lead to deal' })
  convert(
    @Param('leadId') leadId: string,
    @Body('pipelineId') pipelineId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.dealsService.convertFromLead(tenantId, leadId, pipelineId);
  }
}
