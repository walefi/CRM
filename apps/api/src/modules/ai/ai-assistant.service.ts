import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AssistantAnswer {
  question: string;
  answer: string;
  data: any;
  sources: string[];
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ask(tenantId: string, question: string): Promise<AssistantAnswer> {
    const normalized = question.toLowerCase().trim();

    if (
      this.matches(normalized, ['leads', 'lead', 'quentes', 'quente', 'frio', 'frios', 'melhores'])
    ) {
      return this.answerHotLeads(tenantId, normalized);
    }
    if (
      this.matches(normalized, ['vendedor', 'vendedores', 'desempenho', 'performance', 'equipe'])
    ) {
      return this.answerSalesPerformance(tenantId);
    }
    if (this.matches(normalized, ['negócios', 'negocio', 'parados', 'pipeline', 'estagnado'])) {
      return this.answerStaleDeals(tenantId);
    }
    if (this.matches(normalized, ['tarefas', 'tarefa', 'atrasada', 'atrasadas', 'pendente'])) {
      return this.answerOverdueTasks(tenantId);
    }
    if (this.matches(normalized, ['clientes', 'cliente', 'receita', 'maior', 'valor'])) {
      return this.answerTopClients(tenantId);
    }
    if (this.matches(normalized, ['tickets', 'ticket', 'suporte', 'abertos', 'atenção'])) {
      return this.answerTicketStatus(tenantId);
    }
    if (this.matches(normalized, ['resumo', 'dashboard', 'visão', 'geral'])) {
      return this.answerDashboard(tenantId);
    }

    return this.answerGeneric(tenantId, question);
  }

  private matches(text: string, keywords: string[]): boolean {
    return keywords.some((k) => text.includes(k));
  }

  private async answerHotLeads(tenantId: string, question: string): Promise<AssistantAnswer> {
    const prismaAny = this.prisma as any;
    const isHot =
      question.includes('quente') || question.includes('quentes') || question.includes('melhores');
    const where: any = {
      tenantId,
      deletedAt: null,
      status: { notIn: ['CONVERTED', 'LOST'] },
    };
    if (isHot) {
      where.score = { gte: 60 };
    } else {
      where.score = { lte: 20 };
    }

    const leads = await prismaAny.lead.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        score: true,
        status: true,
        source: true,
        companyName: true,
      },
      orderBy: { score: isHot ? 'desc' : 'asc' },
      take: 10,
    });

    const label = isHot ? 'quentes' : 'frios';
    const answer =
      leads.length > 0
        ? `Encontrei ${leads.length} leads ${label}:\n${leads.map((l: any) => `- ${l.firstName} ${l.lastName} (score: ${l.score || 0}, ${l.status})`).join('\n')}`
        : `Não encontrei leads ${label} no momento.`;

    return { question, answer, data: leads, sources: ['leads'] };
  }

  private async answerSalesPerformance(tenantId: string): Promise<AssistantAnswer> {
    const prismaAny = this.prisma as any;

    const users = await prismaAny.user.findMany({
      where: { tenantId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true },
    });

    const performance = [];
    for (const user of users.slice(0, 10)) {
      const dealCount = await prismaAny.deal.count({
        where: { tenantId, ownerId: user.id, deletedAt: null },
      });
      const wonCount = await prismaAny.deal.count({
        where: { tenantId, ownerId: user.id, deletedAt: null, status: 'WON' },
      });
      const leadCount = await prismaAny.lead.count({
        where: { tenantId, ownerId: user.id, deletedAt: null },
      });

      performance.push({
        user: `${user.firstName} ${user.lastName}`,
        deals: dealCount,
        won: wonCount,
        leads: leadCount,
        winRate: dealCount > 0 ? Math.round((wonCount / dealCount) * 100) : 0,
      });
    }

    performance.sort((a: any, b: any) => b.winRate - a.winRate);

    const answer =
      performance.length > 0
        ? `Desempenho da equipe:\n${performance.map((p: any) => `- ${p.user}: ${p.deals} negócios, ${p.won} ganhos, ${p.winRate}% taxa de conversão`).join('\n')}`
        : 'Não há vendedores ativos no momento.';

    return {
      question: 'Desempenho dos vendedores',
      answer,
      data: performance,
      sources: ['deals', 'leads', 'users'],
    };
  }

  private async answerStaleDeals(tenantId: string): Promise<AssistantAnswer> {
    const prismaAny = this.prisma as any;
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);

    const deals = await prismaAny.deal.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ['WON', 'LOST', 'CANCELLED'] },
        updatedAt: { lte: twoWeeksAgo },
      },
      select: { id: true, title: true, value: true, status: true, updatedAt: true },
      orderBy: { value: 'desc' },
      take: 10,
    });

    const answer =
      deals.length > 0
        ? `Encontrei ${deals.length} negócios parados há mais de 2 semanas:\n${deals.map((d: any) => `- ${d.title} (R$ ${d.value || 0}, ${d.status}, último update: ${d.updatedAt?.toLocaleDateString('pt-BR')})`).join('\n')}`
        : 'Não há negócios parados no momento.';

    return { question: 'Negócios parados', answer, data: deals, sources: ['deals'] };
  }

  private async answerOverdueTasks(tenantId: string): Promise<AssistantAnswer> {
    const prismaAny = this.prisma as any;

    const tasks = await prismaAny.task.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ['DONE', 'CANCELLED'] },
        dueDate: { lt: new Date() },
      },
      select: { id: true, title: true, status: true, priority: true, dueDate: true },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    const answer =
      tasks.length > 0
        ? `Encontrei ${tasks.length} tarefas atrasadas:\n${tasks.map((t: any) => `- ${t.title} (prioridade: ${t.priority}, prazo: ${t.dueDate?.toLocaleDateString('pt-BR')})`).join('\n')}`
        : 'Não há tarefas atrasadas no momento.';

    return { question: 'Tarefas atrasadas', answer, data: tasks, sources: ['tasks'] };
  }

  private async answerTopClients(tenantId: string): Promise<AssistantAnswer> {
    const prismaAny = this.prisma as any;

    const companies = await prismaAny.company.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        _count: { select: { contacts: true, leads: true, deals: true } },
        deals: {
          select: { value: true, status: true },
          where: { deletedAt: null, status: 'WON' },
        },
      },
      take: 10,
    });

    const withRevenue = companies
      .map((c: any) => ({
        name: c.name,
        contacts: c._count?.contacts || 0,
        leads: c._count?.leads || 0,
        deals: c._count?.deals || 0,
        revenue: c.deals?.reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0) || 0,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue);

    const answer =
      withRevenue.length > 0
        ? `Top clientes por receita:\n${withRevenue.map((c: any) => `- ${c.name}: R$ ${c.revenue.toFixed(2)} (${c.deals} negócios)`).join('\n')}`
        : 'Não há empresas com receita registrada.';

    return {
      question: 'Maiores clientes',
      answer,
      data: withRevenue,
      sources: ['companies', 'deals'],
    };
  }

  private async answerTicketStatus(tenantId: string): Promise<AssistantAnswer> {
    const prismaAny = this.prisma as any;

    const total = await prismaAny.ticket.count({ where: { tenantId } });
    const open = await prismaAny.ticket.count({
      where: { tenantId, status: { notIn: ['closed', 'resolved'] } },
    });
    const urgent = await prismaAny.ticket.count({
      where: {
        tenantId,
        status: { notIn: ['closed', 'resolved'] },
        priority: { in: ['urgent', 'critical'] },
      },
    });

    const byPriority = await prismaAny.ticket.groupBy({
      by: ['priority'],
      where: { tenantId, status: { notIn: ['closed', 'resolved'] } },
      _count: true,
    });

    const answer = `Status dos tickets: ${total} total, ${open} abertos, ${urgent} urgentes.\nDistribuição por prioridade:\n${byPriority.map((p: any) => `- ${p.priority}: ${p._count}`).join('\n')}`;

    return {
      question: 'Status dos tickets',
      answer,
      data: { total, open, urgent, byPriority },
      sources: ['tickets'],
    };
  }

  private async answerDashboard(tenantId: string): Promise<AssistantAnswer> {
    const prismaAny = this.prisma as any;

    const [leadCount, dealCount, taskCount, ticketCount] = await Promise.all([
      prismaAny.lead.count({ where: { tenantId, deletedAt: null } }),
      prismaAny.deal.count({
        where: { tenantId, deletedAt: null, status: { notIn: ['WON', 'LOST', 'CANCELLED'] } },
      }),
      prismaAny.task.count({
        where: { tenantId, deletedAt: null, status: { notIn: ['DONE', 'CANCELLED'] } },
      }),
      prismaAny.ticket.count({ where: { tenantId, status: { notIn: ['closed', 'resolved'] } } }),
    ]);

    const answer = `Visão geral do CRM:\n- Leads ativos: ${leadCount}\n- Negócios em aberto: ${dealCount}\n- Tarefas pendentes: ${taskCount}\n- Tickets abertos: ${ticketCount}`;

    return {
      question: 'Visão geral',
      answer,
      data: { leads: leadCount, deals: dealCount, tasks: taskCount, tickets: ticketCount },
      sources: ['leads', 'deals', 'tasks', 'tickets'],
    };
  }

  private async answerGeneric(tenantId: string, question: string): Promise<AssistantAnswer> {
    return {
      question,
      answer:
        'Desculpe, não consegui responder a essa pergunta com os dados disponíveis. Tente perguntar sobre leads, negócios, tickets, tarefas ou desempenho da equipe.',
      data: null,
      sources: [],
    };
  }
}
