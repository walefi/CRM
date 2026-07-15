import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('providers')
  @ApiOperation({ summary: 'List all available integration providers' })
  getProviders() {
    return this.integrationsService.getProviders();
  }

  @Get()
  @ApiOperation({ summary: 'List integrations' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.integrationsService.findAll(tenantId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Integration statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.integrationsService.getStats(tenantId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Integration health check' })
  getHealth(@CurrentUser('tenantId') tenantId: string, @Query('id') id?: string) {
    return this.integrationsService.getHealth(tenantId, id);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Integration logs' })
  getLogs(
    @CurrentUser('tenantId') tenantId: string,
    @Query('integrationId') integrationId?: string,
    @Query('page') page?: number,
  ) {
    return this.integrationsService.getLogs(tenantId, integrationId, page);
  }

  @Get('syncs')
  @ApiOperation({ summary: 'Sync history' })
  getSyncHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Query('integrationId') integrationId?: string,
    @Query('page') page?: number,
  ) {
    return this.integrationsService.getSyncHistory(tenantId, integrationId, page);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create integration' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.integrationsService.create(tenantId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get integration by ID' })
  findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.integrationsService.findById(tenantId, id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update integration' })
  update(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.integrationsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete integration' })
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.integrationsService.remove(tenantId, id);
  }

  @Post('connect')
  @Roles('admin')
  @ApiOperation({ summary: 'Connect integration via OAuth/API key' })
  connect(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: { integrationId: string; authType: string; scopes?: string[]; metadata?: any },
  ) {
    return this.integrationsService.connect(tenantId, dto.integrationId, dto);
  }

  @Post('disconnect')
  @Roles('admin')
  @ApiOperation({ summary: 'Disconnect integration' })
  disconnect(@CurrentUser('tenantId') tenantId: string, @Body() dto: { integrationId: string }) {
    return this.integrationsService.disconnect(tenantId, dto.integrationId);
  }

  @Post('sync')
  @Roles('admin')
  @ApiOperation({ summary: 'Trigger sync' })
  sync(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { integrationId: string; direction?: string },
  ) {
    return this.integrationsService.sync(tenantId, dto.integrationId, userId, dto);
  }

  @Post('test')
  @Roles('admin')
  @ApiOperation({ summary: 'Test integration connection' })
  test(@CurrentUser('tenantId') tenantId: string, @Body() dto: { integrationId: string }) {
    return this.integrationsService.test(tenantId, dto.integrationId);
  }
}
