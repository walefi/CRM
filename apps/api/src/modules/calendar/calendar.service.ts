import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvents(tenantId: string, userId: string, startDate?: string, endDate?: string) {
    const where: any = { userId };
    if (startDate && endDate) {
      where.startAt = { gte: new Date(startDate) };
      where.endAt = { lte: new Date(endDate) };
    }
    return (this.prisma as any).event.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: { calendar: { select: { id: true, name: true, color: true } }, participants: true, reminders: true, resources: true },
    });
  }

  async getCalendars(tenantId: string) {
    return this.prisma.calendar.findMany({
      where: { tenantId },
      include: { _count: { select: { events: true } } },
    });
  }

  async createEvent(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const event = await prismaAny.event.create({
      data: {
        title: dto.title, description: dto.description, startAt: new Date(dto.startAt), endAt: new Date(dto.endAt),
        allDay: dto.allDay || false, location: dto.location, type: dto.type || 'meeting',
        recurrence: (dto.recurrence as any) || null, recurrenceRule: dto.recurrenceRule,
        videoLink: dto.videoLink, capacity: dto.capacity, status: dto.status || 'confirmed',
        calendarId: dto.calendarId, userId, contactId: dto.contactId, dealId: dto.dealId,
        participants: dto.participants?.length ? { create: dto.participants.map((p: any) => ({ name: p.name, email: p.email, role: p.role || 'attendee' })) } : undefined,
        reminders: dto.reminders?.length ? { create: dto.reminders.map((r: any) => ({ minutes: r.minutes || 15, channel: r.channel || 'notification' })) } : undefined,
        resources: dto.resources?.length ? { create: dto.resources.map((r: any) => ({ name: r.name, type: r.type || 'room', capacity: r.capacity, location: r.location })) } : undefined,
      },
      include: { calendar: { select: { id: true, name: true, color: true } }, participants: true },
    });
    if (!dto.reminders?.length && !dto.noDefaultReminder) {
      await prismaAny.eventReminder.create({ data: { eventId: event.id, minutes: 15, channel: 'notification' } });
    }
    return event;
  }

  async updateEvent(id: string, tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const data: any = {};
    if (dto.title) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startAt) data.startAt = new Date(dto.startAt);
    if (dto.endAt) data.endAt = new Date(dto.endAt);
    if (dto.status) data.status = dto.status;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.videoLink !== undefined) data.videoLink = dto.videoLink;
    if (dto.recurrenceRule) data.recurrenceRule = dto.recurrenceRule;
    return prismaAny.event.update({ where: { id }, data, include: { participants: true, reminders: true } });
  }

  async deleteEvent(id: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.eventReminder.deleteMany({ where: { eventId: id } });
    await prismaAny.eventParticipant.deleteMany({ where: { eventId: id } });
    await prismaAny.eventResource.deleteMany({ where: { eventId: id } });
    await prismaAny.event.delete({ where: { id } });
  }

  async getAvailability(tenantId: string, userId: string, startDate: string, endDate: string) {
    const events = await this.getEvents(tenantId, userId, startDate, endDate);
    const busy = events.map((e: any) => ({ startAt: e.startAt, endAt: e.endAt, title: e.title }));
    return { busy, free: [], workingHours: { start: '08:00', end: '18:00' }, timezone: 'America/Sao_Paulo' };
  }

  async schedule(tenantId: string, userId: string, dto: any) {
    return this.createEvent(tenantId, userId, {
      ...dto,
      title: dto.title || 'Scheduled Meeting',
      type: dto.type || 'meeting',
    });
  }

  async invite(tenantId: string, eventId: string, participants: any[]) {
    const prismaAny = this.prisma as any;
    if (participants?.length) {
      await prismaAny.eventParticipant.createMany({
        data: participants.map((p: any) => ({ eventId, name: p.name, email: p.email, role: p.role || 'attendee' })),
      });
    }
    return prismaAny.event.findUnique({ where: { id: eventId }, include: { participants: true } });
  }

  async respondToInvitation(tenantId: string, eventId: string, participantEmail: string, status: string) {
    const prismaAny = this.prisma as any;
    return prismaAny.eventParticipant.updateMany({
      where: { eventId, email: participantEmail },
      data: { status, respondedAt: new Date() },
    });
  }

  async getReminders(tenantId: string, userId: string) {
    const prismaAny = this.prisma as any;
    return prismaAny.eventReminder.findMany({
      where: { event: { userId }, sent: false },
      include: { event: { select: { id: true, title: true, startAt: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const [totalEvents, todayEvents, calendars, upcomingReminders] = await Promise.all([
      prismaAny.event.count({ where: { calendar: { tenantId } } }),
      prismaAny.event.count({ where: { calendar: { tenantId }, startAt: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.calendar.count({ where: { tenantId } }),
      prismaAny.eventReminder.count({ where: { event: { calendar: { tenantId } }, sent: false } }),
    ]);
    return { totalEvents, todayEvents, calendars, upcomingReminders };
  }
}
