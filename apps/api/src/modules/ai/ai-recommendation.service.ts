import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AiRecommendation {
  id?: string;
  entityType: string;
  entityId: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  score: number;
  actionType?: string;
  actionData?: any;
  status: string;
}

@Injectable()
export class AiRecommendationService {
  private readonly logger = new Logger(AiRecommendationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(
    tenantId: string,
    entityType?: string,
    limit = 20,
  ): Promise<AiRecommendation[]> {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId, status: 'pending' };
    if (entityType) where.entityType = entityType;

    const stored = await prismaAny.aiRecommendation.findMany({
      where,
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    if (stored.length > 0) return stored;

    const generated = await this.generateRecommendations(tenantId);
    return generated.slice(0, limit);
  }

  async generateRecommendations(tenantId: string): Promise<AiRecommendation[]> {
    const recommendations: AiRecommendation[] = [];

    const leadRecs = await this.recommendForLeads(tenantId);
    const dealRecs = await this.recommendForDeals(tenantId);
    const ticketRecs = await this.recommendForTickets(tenantId);
    const taskRecs = await this.recommendForTasks(tenantId);

    recommendations.push(...leadRecs, ...dealRecs, ...ticketRecs, ...taskRecs);

    const prismaAny = this.prisma as any;
    for (const rec of recommendations) {
      await prismaAny.aiRecommendation
        .upsert({
          where: {
            id: 'non-existent',
          },
          create: {
            entityType: rec.entityType,
            entityId: rec.entityId,
            type: rec.type,
            title: rec.title,
            description: rec.description,
            priority: rec.priority,
            score: rec.score,
            actionType: rec.actionType,
            actionData: rec.actionData || undefined,
            status: 'pending',
            tenantId,
          },
          update: {},
        })
        .catch(() => {});
    }

    return recommendations;
  }

  async acceptRecommendation(tenantId: string, recommendationId: string) {
    const prismaAny = this.prisma as any;
    const rec = await prismaAny.aiRecommendation.findFirst({
      where: { id: recommendationId, tenantId },
    });
    if (!rec) throw new Error('Recommendation not found');

    await prismaAny.aiRecommendation.update({
      where: { id: recommendationId },
      data: { status: 'accepted' },
    });

    return { success: true, recommendation: rec };
  }

  async dismissRecommendation(tenantId: string, recommendationId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.aiRecommendation.updateMany({
      where: { id: recommendationId, tenantId },
      data: { status: 'dismissed' },
    });
    return { success: true };
  }

  private async recommendForLeads(tenantId: string): Promise<AiRecommendation[]> {
    const prismaAny = this.prisma as any;
    const recs: AiRecommendation[] = [];

    const hotLeads = await prismaAny.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['NEW', 'CONTACTED'] },
        score: { gte: 60 },
      },
      orderBy: { score: 'desc' },
      take: 5,
    });

    for (const lead of hotLeads) {
      recs.push({
        entityType: 'lead',
        entityId: lead.id,
        type: 'follow_up',
        title: `Contatar lead quente: ${lead.firstName} ${lead.lastName}`,
        description: `Lead com score ${lead.score} (${lead.status}). Entre em contato para aumentar a chance de conversão.`,
        priority: lead.score >= 80 ? 'high' : 'medium',
        score: lead.score || 50,
        actionType: 'create_activity',
        actionData: {
          leadId: lead.id,
          type: 'CALL',
          subject: `Follow-up lead quente: ${lead.firstName}`,
        },
        status: 'pending',
      });
    }

    const staleLeads = await prismaAny.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ['CONVERTED', 'LOST'] },
        updatedAt: { lte: new Date(Date.now() - 7 * 86400000) },
      },
      take: 3,
    });

    for (const lead of staleLeads) {
      recs.push({
        entityType: 'lead',
        entityId: lead.id,
        type: 're_engage',
        title: `Reengajar lead parado: ${lead.firstName} ${lead.lastName}`,
        description: `Lead sem atualização há mais de 7 dias. Considere enviar um email ou ligação.`,
        priority: 'low',
        score: 20,
        actionType: 'send_email',
        actionData: { leadId: lead.id },
        status: 'pending',
      });
    }

    return recs;
  }

  private async recommendForDeals(tenantId: string): Promise<AiRecommendation[]> {
    const prismaAny = this.prisma as any;
    const recs: AiRecommendation[] = [];

    const staleDeals = await prismaAny.deal.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ['WON', 'LOST', 'CANCELLED'] },
        updatedAt: { lte: new Date(Date.now() - 14 * 86400000) },
      },
      orderBy: { value: 'desc' },
      take: 5,
    });

    for (const deal of staleDeals) {
      recs.push({
        entityType: 'deal',
        entityId: deal.id,
        type: 'advance_deal',
        title: `Avançar negócio parado: ${deal.title}`,
        description: `Negócio sem atualização há mais de 2 semanas. Valor: R$ ${deal.value || 0}.`,
        priority: deal.value > 10000 ? 'high' : 'medium',
        score: 50,
        actionType: 'create_task',
        actionData: { dealId: deal.id, title: `Follow-up negócio: ${deal.title}` },
        status: 'pending',
      });
    }

    return recs;
  }

  private async recommendForTickets(tenantId: string): Promise<AiRecommendation[]> {
    const prismaAny = this.prisma as any;
    const recs: AiRecommendation[] = [];

    const urgentTickets = await prismaAny.ticket.findMany({
      where: {
        tenantId,
        status: { notIn: ['closed', 'resolved'] },
        priority: { in: ['urgent', 'critical', 'high'] },
      },
      take: 5,
    });

    for (const ticket of urgentTickets) {
      recs.push({
        entityType: 'ticket',
        entityId: ticket.id,
        type: 'escalate_ticket',
        title: `Ticket urgente precisa de atenção: ${ticket.subject}`,
        description: `Ticket com prioridade ${ticket.priority} e status ${ticket.subject}.`,
        priority: 'high',
        score: 80,
        actionType: 'assign_ticket',
        actionData: { ticketId: ticket.id },
        status: 'pending',
      });
    }

    return recs;
  }

  private async recommendForTasks(tenantId: string): Promise<AiRecommendation[]> {
    const prismaAny = this.prisma as any;
    const recs: AiRecommendation[] = [];

    const overdueTasks = await prismaAny.task.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ['DONE', 'CANCELLED'] },
        dueDate: { lt: new Date() },
      },
      take: 5,
    });

    for (const task of overdueTasks) {
      recs.push({
        entityType: 'task',
        entityId: task.id,
        type: 'overdue_task',
        title: `Tarefa atrasada: ${task.title}`,
        description: `Tarefa com prazo em ${task.dueDate?.toLocaleDateString('pt-BR') || 'N/A'} e status ${task.status}.`,
        priority: task.priority === 'URGENT' ? 'high' : 'medium',
        score: 60,
        actionType: 'update_task',
        actionData: { taskId: task.id },
        status: 'pending',
      });
    }

    return recs;
  }
}
