import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PromptContext {
  entityType?: string;
  entityId?: string;
  entityTypeLabel?: string;
  entityData?: any;
  timeline?: any[];
  activities?: any[];
  conversations?: any[];
  tasks?: any[];
  extra?: Record<string, any>;
}

@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async buildLeadScoringPrompt(tenantId: string, leadId: string): Promise<string> {
    const prismaAny = this.prisma as any;
    const lead = await prismaAny.lead.findFirst({
      where: { id: leadId, tenantId, deletedAt: null },
      include: {
        company: { select: { name: true, size: true, industry: true } },
        activities: { select: { type: true, subject: true }, where: { deletedAt: null }, take: 10 },
        conversations: { select: { subject: true, status: true }, take: 5 },
      },
    });

    if (!lead) return '';

    return `Analise o perfil deste lead e sugira ações para aumentar a conversão:
- Nome: ${lead.firstName} ${lead.lastName}
- Email: ${lead.email || 'N/A'}
- Empresa: ${lead.companyName || lead.company?.name || 'N/A'}
- Cargo: ${lead.position || 'N/A'}
- Origem: ${lead.source}
- Score atual: ${lead.score || 'N/A'}
- Status: ${lead.status}
- Atividades: ${lead.activities?.length || 0}
- Conversas: ${lead.conversations?.length || 0}`;
  }

  async buildTicketSummaryPrompt(tenantId: string, ticketId: string): Promise<string> {
    const prismaAny = this.prisma as any;
    const ticket = await prismaAny.ticket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        ticketComment: {
          select: { content: true, isInternal: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!ticket) return '';

    return `Resuma este ticket de suporte:
- Assunto: ${ticket.subject}
- Status: ${ticket.status}
- Prioridade: ${ticket.priority}
- Canal: ${ticket.channel || 'N/A'}
- Últimos comentários: ${ticket.ticketComment?.map((c: any) => c.content).join(' | ') || 'Nenhum'}`;
  }

  async buildEmailGenerationPrompt(tenantId: string, context: PromptContext): Promise<string> {
    let prompt = 'Gere um email profissional em português para o CRM.\n\n';

    if (context.entityType && context.entityData) {
      prompt += `Contexto: ${context.entityTypeLabel || context.entityType}\n`;
      if (context.entityType === 'lead') {
        prompt += `Lead: ${context.entityData.firstName} ${context.entityData.lastName}\n`;
        prompt += `Empresa: ${context.entityData.companyName || 'N/A'}\n`;
      } else if (context.entityType === 'deal') {
        prompt += `Negócio: ${context.entityData.title}\n`;
        prompt += `Valor: R$ ${context.entityData.value || 0}\n`;
      }
    }

    if (context.extra?.['tone']) {
      prompt += `Tom: ${context.extra['tone']}\n`;
    }
    if (context.extra?.['purpose']) {
      prompt += `Objetivo: ${context.extra['purpose']}\n`;
    }

    prompt += '\nO email deve ser conciso, profissional e incluir uma chamada para ação.';
    return prompt;
  }

  async buildMessageGenerationPrompt(tenantId: string, context: PromptContext): Promise<string> {
    let prompt = 'Gere uma mensagem curta para WhatsApp ou chat.\n\n';

    if (context.entityType && context.entityData) {
      prompt += `Contexto: ${context.entityTypeLabel || context.entityType}\n`;
      if (context.entityType === 'lead') {
        prompt += `Lead: ${context.entityData.firstName} ${context.entityData.lastName}\n`;
      }
    }

    if (context.extra?.['channel']) {
      prompt += `Canal: ${context.extra['channel']}\n`;
    }
    if (context.extra?.['purpose']) {
      prompt += `Objetivo: ${context.extra['purpose']}\n`;
    }

    prompt += '\nA mensagem deve ser direta e amigável.';
    return prompt;
  }

  async buildAssistantPrompt(tenantId: string, question: string): Promise<string> {
    return `Você é um assistente CRM inteligente. Responda à pergunta abaixo usando os dados disponíveis no sistema CRM.

Pergunta: ${question}

Responda de forma concisa e baseada em dados reais.`;
  }

  async buildInsightsPrompt(tenantId: string): Promise<string> {
    const prismaAny = this.prisma as any;

    const [leadCount, dealCount, taskCount, ticketCount] = await Promise.all([
      prismaAny.lead.count({ where: { tenantId, deletedAt: null } }),
      prismaAny.deal.count({ where: { tenantId, deletedAt: null } }),
      prismaAny.task.count({
        where: { tenantId, deletedAt: null, status: { notIn: ['DONE', 'CANCELLED'] } },
      }),
      prismaAny.ticket.count({ where: { tenantId, status: { notIn: ['closed', 'resolved'] } } }),
    ]);

    return `Gere 3 insights acionáveis para a equipe comercial com base nos seguintes dados do CRM:
- Total de leads: ${leadCount}
- Total de negócios: ${dealCount}
- Tarefas pendentes: ${taskCount}
- Tickets abertos: ${ticketCount}

Cada insight deve ser uma frase curta e específica.`;
  }

  async getPromptTemplates(tenantId: string, category?: string) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId, isActive: true };
    if (category) where.category = category;
    return prismaAny.aIPrompt.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }

  async createPromptTemplate(
    tenantId: string,
    userId: string,
    dto: { name: string; prompt: string; category?: string; variables?: string[]; tags?: string[] },
  ) {
    const prismaAny = this.prisma as any;
    return prismaAny.aIPrompt.create({
      data: {
        name: dto.name,
        prompt: dto.prompt,
        category: dto.category || 'custom',
        variables: dto.variables || [],
        tags: dto.tags || [],
        tenantId,
        userId,
        version: 1,
      },
    });
  }
}
