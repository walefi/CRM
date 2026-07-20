import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  findAll(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Query() dto: any) {
    return this.notificationsService.getNotifications(tenantId, userId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Notification statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.getStats(tenantId, userId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List templates' })
  getTemplates(@CurrentUser('tenantId') tenantId: string) {
    return this.notificationsService.getTemplates(tenantId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create template' })
  createTemplate(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.notificationsService.createTemplate(tenantId, userId, dto);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete template' })
  deleteTemplate(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.notificationsService.deleteTemplate(tenantId, id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  getPreferences(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.getPreferences(tenantId, userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update preference' })
  updatePreference(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.notificationsService.updatePreference(tenantId, userId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create notification' })
  create(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.notificationsService.send(tenantId, userId, dto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark as read' })
  markAsRead(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markAsRead(tenantId, id, userId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  markAllAsRead(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(tenantId, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification' })
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.notificationsService.delete(tenantId, id);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send notification' })
  send(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.notificationsService.send(tenantId, dto.userId, dto);
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule notification' })
  schedule(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.notificationsService.schedule(tenantId, userId, dto);
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast notification' })
  broadcast(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.notificationsService.broadcast(tenantId, dto);
  }
}
