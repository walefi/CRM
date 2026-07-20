import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SummaryResult {
  entityType: string;
  entityId: string;
  summary: string;
  highlights: string[];
  metrics: Record<string, number>;
  generatedAt: Date;
}

@Injectable()
export class AiSummaryService {
  private readonly logger = new Logger(AiSummaryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async summarizeLead(tenantId: string, leadId: string): Promise<SummaryResult> {
    const prismaAny = this.prisma as any;

    const lead = await prismaAny.lead.findFirst({
      where: { id: leadId, tenantId, deletedAt: null },
      include: {
        owner: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
        activities: {
          select: { id: true, type: true, subject: true, createdAt: true },
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        conversations: {
          select: { id: true, subject: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        tasks: {
          select: { id: true, title: true, status: true, completedAt: true },
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!lead) throw new Error('Lead not found');

    const highlights: string[] = [];
    highlights.push(`${lead.firstName} ${lead.lastName} — ${lead.status}`);
    if (lead.companyName) highlights.push(`Empresa: ${lead.companyName}`);
    if (lead.position) highlights.push(`Cargo: ${lead.position}`);
    if (lead.score != null) highlights.push(`Score: ${lead.score}/100`);
    if (lead.owner) highlights.push(`Responsável: ${lead.owner.firstName} ${lead.owner.lastName}`);

    const activityCount = lead.activities?.length || 0;
    const conversationCount = lead.conversations?.length || 0;
    const completedTasks = lead.tasks?.filter((t: any) => t.status === 'DONE').length || 0;
    const totalTasks = lead.tasks?.length || 0;

    const metrics = {
      activities: activityCount,
      conversations: conversationCount,
      tasksCompleted: completedTasks,
      tasksTotal: totalTasks,
      score: lead.score || 0,
    };

    const summaryParts: string[] = [];
    summaryParts.push(`Lead ${lead.firstName} ${lead.lastName} está no estágio ${lead.status}.`);
    if (activityCount > 0) summaryParts.push(`Possui ${activityCount} atividades registradas.`);
    if (conversationCount > 0) summaryParts.push(`${conversationCount} conversas realizadas.`);
    if (completedTasks > 0)
      summaryParts.push(`${completedTasks} de ${totalTasks} tarefas concluídas.`);
    if (lead.score != null) {
      if (lead.score >= 80) summaryParts.push('Lead com ALTO potencial de conversão.');
      else if (lead.score >= 60) summaryParts.push('Lead com bom potencial.');
      else if (lead.score <= 20) summaryParts.push('Lead frio — precisa de ação de engajamento.');
    }

    const summary = summaryParts.join(' ');

    return {
      entityType: 'lead',
      entityId: leadId,
      summary,
      highlights,
      metrics,
      generatedAt: new Date(),
    };
  }

  async summarizeTicket(tenantId: string, ticketId: string): Promise<SummaryResult> {
    const prismaAny = this.prisma as any;

    const ticket = await prismaAny.ticket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        _count: { select: { ticketComment: true, ticketHistory: true } },
      },
    });

    if (!ticket) throw new Error('Ticket not found');

    const highlights: string[] = [];
    highlights.push(`Ticket: ${ticket.subject}`);
    highlights.push(`Status: ${ticket.status} | Prioridade: ${ticket.priority}`);
    if (ticket.assignedToId) highlights.push(`Atribuído`);

    const summary = `Ticket "${ticket.subject}" está com status ${ticket.status} e prioridade ${ticket.priority}. ${ticket._count?.ticketComment || 0} comentários registrados. ${ticket._count?.ticketHistory || 0} mudanças no histórico.`;

    const metrics = {
      comments: ticket._count?.ticketComment || 0,
      historyEntries: ticket._count?.ticketHistory || 0,
      reopenedCount: ticket.reopenedCount || 0,
    };

    return {
      entityType: 'ticket',
      entityId: ticketId,
      summary,
      highlights,
      metrics,
      generatedAt: new Date(),
    };
  }

  async summarizeDeal(tenantId: string, dealId: string): Promise<SummaryResult> {
    const prismaAny = this.prisma as any;

    const deal = await prismaAny.deal.findFirst({
      where: { id: dealId, tenantId, deletedAt: null },
      include: {
        owner: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
        stage: { select: { name: true } },
        pipeline: { select: { name: true } },
        tasks: { select: { id: true, status: true }, where: { deletedAt: null } },
      },
    });

    if (!deal) throw new Error('Deal not found');

    const highlights: string[] = [];
    highlights.push(`Negócio: ${deal.title}`);
    highlights.push(`Valor: R$ ${(deal.value as any) || 0}`);
    highlights.push(`Estágio: ${deal.stage?.name || 'N/A'}`);
    if (deal.company) highlights.push(`Empresa: ${deal.company.name}`);

    const totalTasks = deal.tasks?.length || 0;
    const completedTasks = deal.tasks?.filter((t: any) => t.status === 'DONE').length || 0;

    const metrics = {
      value: Number(deal.value) || 0,
      tasksCompleted: completedTasks,
      tasksTotal: totalTasks,
    };

    const summary = `Negócio "${deal.title}" no pipeline ${deal.pipeline?.name || 'N/A'}, estágio ${deal.stage?.name || 'N/A'}. Valor estimado: R$ ${Number(deal.value) || 0}. ${completedTasks} de ${totalTasks} tarefas concluídas.`;

    return {
      entityType: 'deal',
      entityId: dealId,
      summary,
      highlights,
      metrics,
      generatedAt: new Date(),
    };
  }

  async summarizeConversation(tenantId: string, conversationId: string): Promise<SummaryResult> {
    const prismaAny = this.prisma as any;

    const conversation = await prismaAny.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        messages: {
          select: { id: true, direction: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) throw new Error('Conversation not found');

    const totalMessages = conversation.messages?.length || 0;
    const inbound =
      conversation.messages?.filter((m: any) => m.direction === 'inbound').length || 0;
    const outbound =
      conversation.messages?.filter((m: any) => m.direction === 'outbound').length || 0;

    const highlights: string[] = [];
    highlights.push(`Conversa: ${conversation.subject || 'Sem assunto'}`);
    highlights.push(`Canal: ${conversation.channel || 'N/A'}`);
    highlights.push(`Status: ${conversation.status}`);

    const metrics = {
      totalMessages,
      inbound,
      outbound,
    };

    const summary = `Conversa "${conversation.subject || 'Sem assunto'}" via ${conversation.channel || 'N/A'}. Status: ${conversation.status}. ${totalMessages} mensagens (${inbound} recebidas, ${outbound} enviadas).`;

    return {
      entityType: 'conversation',
      entityId: conversationId,
      summary,
      highlights,
      metrics,
      generatedAt: new Date(),
    };
  }

  async summarizeContact(tenantId: string, contactId: string): Promise<SummaryResult> {
    const prismaAny = this.prisma as any;

    const contact = await prismaAny.contact.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
      include: {
        owner: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
        _count: { select: { deals: true } },
      },
    });

    if (!contact) throw new Error('Contact not found');

    const highlights: string[] = [];
    highlights.push(`Contato: ${contact.firstName} ${contact.lastName}`);
    if (contact.company) highlights.push(`Empresa: ${contact.company.name}`);
    highlights.push(`${contact._count?.deals || 0} negócios associados`);

    const metrics = { deals: contact._count?.deals || 0 };

    const summary = `Contato ${contact.firstName} ${contact.lastName}${contact.company ? ` da empresa ${contact.company.name}` : ''}. ${contact._count?.deals || 0} negócios associados.`;

    return {
      entityType: 'contact',
      entityId: contactId,
      summary,
      highlights,
      metrics,
      generatedAt: new Date(),
    };
  }

  async summarizeCompany(tenantId: string, companyId: string): Promise<SummaryResult> {
    const prismaAny = this.prisma as any;

    const company = await prismaAny.company.findFirst({
      where: { id: companyId, tenantId, deletedAt: null },
      include: {
        _count: { select: { contacts: true, leads: true, deals: true } },
      },
    });

    if (!company) throw new Error('Company not found');

    const highlights: string[] = [];
    highlights.push(`Empresa: ${company.name}`);
    if (company.industry) highlights.push(`Setor: ${company.industry}`);
    highlights.push(
      `${company._count?.contacts || 0} contatos | ${company._count?.leads || 0} leads | ${company._count?.deals || 0} negócios`,
    );

    const metrics = {
      contacts: company._count?.contacts || 0,
      leads: company._count?.leads || 0,
      deals: company._count?.deals || 0,
    };

    const summary = `Empresa ${company.name}${company.industry ? ` (${company.industry})` : ''}. ${company._count?.contacts || 0} contatos, ${company._count?.leads || 0} leads, ${company._count?.deals || 0} negócios associados.`;

    return {
      entityType: 'company',
      entityId: companyId,
      summary,
      highlights,
      metrics,
      generatedAt: new Date(),
    };
  }

  async summarize(tenantId: string, entityType: string, entityId: string): Promise<SummaryResult> {
    switch (entityType) {
      case 'lead':
        return this.summarizeLead(tenantId, entityId);
      case 'ticket':
        return this.summarizeTicket(tenantId, entityId);
      case 'deal':
        return this.summarizeDeal(tenantId, entityId);
      case 'conversation':
        return this.summarizeConversation(tenantId, entityId);
      case 'contact':
        return this.summarizeContact(tenantId, entityId);
      case 'company':
        return this.summarizeCompany(tenantId, entityId);
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }
}
