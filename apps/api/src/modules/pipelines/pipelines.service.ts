import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  CreateStageDto,
  UpdateStageDto,
  KanbanMoveDto,
} from './dto/pipelines.dto';

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.pipeline.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { deals: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string, tenantId: string) {
    const p = await this.prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!p) throw new NotFoundException('Pipeline not found');
    return p;
  }

  async getKanban(pipelineId: string, tenantId: string) {
    const pipeline = await this.findById(pipelineId, tenantId);
    const deals = await this.prisma.deal.findMany({
      where: { tenantId, pipelineId, deletedAt: null },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        stage: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stages = pipeline.stages.map((stage) => ({
      ...stage,
      deals: deals.filter((d) => d.stageId === stage.id),
    }));

    return { ...pipeline, stages };
  }

  async create(tenantId: string, dto: CreatePipelineDto) {
    return this.prisma.pipeline.create({
      data: { ...dto, tenantId },
      include: { stages: true },
    });
  }

  async update(id: string, tenantId: string, dto: UpdatePipelineDto) {
    await this.findById(id, tenantId);
    return this.prisma.pipeline.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    await this.prisma.pipeline.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addStage(pipelineId: string, tenantId: string, dto: CreateStageDto) {
    await this.findById(pipelineId, tenantId);
    return this.prisma.pipelineStage.create({
      data: { ...dto, pipelineId },
    });
  }

  async updateStage(id: string, tenantId: string, dto: UpdateStageDto) {
    return this.prisma.pipelineStage.update({ where: { id }, data: dto });
  }

  async deleteStage(id: string) {
    return this.prisma.pipelineStage.delete({ where: { id } });
  }

  async moveDeal(tenantId: string, dto: KanbanMoveDto) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dto.dealId, tenantId },
    });
    if (!deal) throw new NotFoundException('Deal not found');

    const stage = await this.prisma.pipelineStage.findUnique({
      where: { id: dto.stageId },
      select: { isWon: true, isLost: true },
    });

    return this.prisma.deal.update({
      where: { id: dto.dealId },
      data: {
        stageId: dto.stageId,
        status: stage?.isWon ? 'WON' : stage?.isLost ? 'LOST' : 'OPEN',
        wonAt: stage?.isWon ? new Date() : undefined,
        lostAt: stage?.isLost ? new Date() : undefined,
      },
      include: {
        stage: { select: { id: true, name: true, color: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
