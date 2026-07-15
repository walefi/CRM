import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/tenants.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant' })
  getCurrent(@CurrentUser('tenantId') tenantId: string) {
    return this.tenantsService.findById(tenantId);
  }

  @Get('current/stats')
  @ApiOperation({ summary: 'Get current tenant stats' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.tenantsService.getStats(tenantId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get tenant by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.tenantsService.findBySlug(slug);
  }

  @Put('current')
  @Roles('admin')
  @ApiOperation({ summary: 'Update current tenant (admin only)' })
  update(@CurrentUser('tenantId') tenantId: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tenant (admin only)' })
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }
}
