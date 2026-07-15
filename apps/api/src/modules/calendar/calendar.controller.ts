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
  @ApiOperation({ summary: 'Get events (optionally filtered by date range)' })
  getEvents(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.calendarService.getEvents(tenantId, userId, start, end);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create event' })
  createEvent(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.calendarService.createEvent(tenantId, userId, dto);
  }

  @Patch('events/:id')
  @ApiOperation({ summary: 'Update event' })
  updateEvent(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: any,
  ) {
    return this.calendarService.updateEvent(id, tenantId, dto);
  }

  @Delete('events/:id')
  @ApiOperation({ summary: 'Delete event' })
  deleteEvent(@Param('id') id: string) {
    return this.calendarService.deleteEvent(id);
  }
}
