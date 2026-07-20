import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('calendars')
  @ApiOperation({ summary: 'List calendars' })
  getCalendars(@CurrentUser('tenantId') tenantId: string) {
    return this.calendarService.getCalendars(tenantId);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get events' })
  getEvents(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Query('start') start?: string, @Query('end') end?: string) {
    return this.calendarService.getEvents(tenantId, userId, start, end);
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Get event' })
  getEvent(@Param('id') id: string) {
    const prismaAny = (this.calendarService as any).prisma as any;
    return prismaAny?.event?.findUnique({ where: { id }, include: { participants: true, reminders: true, resources: true, calendar: true } }) || {};
  }

  @Post('events')
  @ApiOperation({ summary: 'Create event' })
  createEvent(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.calendarService.createEvent(tenantId, userId, dto);
  }

  @Patch('events/:id')
  @ApiOperation({ summary: 'Update event' })
  updateEvent(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.calendarService.updateEvent(id, tenantId, dto);
  }

  @Delete('events/:id')
  @ApiOperation({ summary: 'Delete event' })
  deleteEvent(@Param('id') id: string) {
    return this.calendarService.deleteEvent(id);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Get availability' })
  getAvailability(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Query('start') start: string, @Query('end') end: string) {
    return this.calendarService.getAvailability(tenantId, userId, start, end);
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule event' })
  schedule(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.calendarService.schedule(tenantId, userId, dto);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite participants' })
  invite(@CurrentUser('tenantId') tenantId: string, @Body() dto: { eventId: string; participants: any[] }) {
    return this.calendarService.invite(tenantId, dto.eventId, dto.participants);
  }

  @Post('respond')
  @ApiOperation({ summary: 'Respond to invitation' })
  respond(@CurrentUser('tenantId') tenantId: string, @Body() dto: { eventId: string; email: string; status: string }) {
    return this.calendarService.respondToInvitation(tenantId, dto.eventId, dto.email, dto.status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Calendar statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.calendarService.getStats(tenantId);
  }
}
