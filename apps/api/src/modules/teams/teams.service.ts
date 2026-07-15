import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto, UpdateTeamDto } from './dto/teams.dto';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.team.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        users: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        users: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async create(tenantId: string, dto: CreateTeamDto) {
    const team = await this.prisma.team.create({
      data: { ...dto, tenantId },
      include: { lead: { select: { id: true, firstName: true, lastName: true } } },
    });
    this.logger.log(`Team "${team.name}" created`);
    return team;
  }

  async update(id: string, tenantId: string, dto: UpdateTeamDto) {
    const { memberIds, ...data } = dto;
    await this.findById(id, tenantId);

    const team = await this.prisma.team.update({
      where: { id },
      data: {
        ...data,
        ...(memberIds ? { users: { set: memberIds.map(uid => ({ id: uid })) } } : {}),
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        users: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
    this.logger.log(`Team "${id}" updated`);
    return team;
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    await this.prisma.team.update({ where: { id }, data: { deletedAt: new Date() } });
    this.logger.log(`Team "${id}" soft-deleted`);
  }
}
