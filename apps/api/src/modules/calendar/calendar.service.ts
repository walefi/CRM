import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvents(tenantId: string, userId: string, startDate?: string, endDate?: string) {
    const where: any = { tenantId, userId };
    if (startDate && endDate) where.startAt = { gte: new Date(startDate), lte: new Date(endDate) };
    return this.prisma.event.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: { calendar: true },
    });
  }

  async getCalendars(tenantId: string) {
    return this.prisma.calendar.findMany({
      where: { tenantId },
      include: { _count: { select: { events: true } } },
    });
  }

  async createEvent(tenantId: string, userId: string, dto: any) {
    return this.prisma.event.create({
      data: { ...dto, tenantId, userId },
      include: { calendar: { select: { id: true, name: true, color: true } } },
    });
  }

  async updateEvent(id: string, tenantId: string, dto: any) {
    return this.prisma.event.update({ where: { id }, data: dto });
  }

  async deleteEvent(id: string) {
    await this.prisma.event.delete({ where: { id } });
  }
}
