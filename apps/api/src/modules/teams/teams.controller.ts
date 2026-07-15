import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto } from './dto/teams.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List all teams' })
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.teamsService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.teamsService.findById(id, tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create team (admin)' })
  create(@Body() dto: CreateTeamDto, @CurrentUser('tenantId') tenantId: string) {
    return this.teamsService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update team (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto, @CurrentUser('tenantId') tenantId: string) {
    return this.teamsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete team (admin)' })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.teamsService.remove(id, tenantId);
  }
}
