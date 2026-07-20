import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CollaborationService } from './collaboration.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Collaboration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class CollaborationController {
  constructor(private readonly collabService: CollaborationService) {}

  @Get('workspaces')
  @ApiOperation({ summary: 'List workspaces' })
  getWorkspaces(@CurrentUser('tenantId') tenantId: string) {
    return this.collabService.getWorkspaces(tenantId);
  }

  @Post('workspaces')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create workspace' })
  createWorkspace(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.collabService.createWorkspace(tenantId, userId, dto);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'List announcements' })
  getAnnouncements(@CurrentUser('tenantId') tenantId: string) {
    return this.collabService.getAnnouncements(tenantId);
  }

  @Post('announcements')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create announcement' })
  createAnnouncement(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.collabService.createAnnouncement(tenantId, userId, dto);
  }

  @Get('meetings')
  @ApiOperation({ summary: 'List meetings' })
  getMeetings(@CurrentUser('tenantId') tenantId: string) {
    return this.collabService.getMeetings(tenantId);
  }

  @Post('meeting')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create meeting' })
  createMeeting(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.collabService.createMeeting(tenantId, userId, dto);
  }

  @Get('collab-stats')
  @ApiOperation({ summary: 'Collaboration statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.collabService.getStats(tenantId);
  }
}
