import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface LeadScoreBreakdown {
  source: number;
  engagement: number;
  company: number;
  recency: number;
  completeness: number;
  activities: number;
  conversations: number;
  total: number;
}

export interface LeadScoreResult {
  leadId: string;
  score: number;
  classification: string;
  breakdown: LeadScoreBreakdown;
  factors: string[];
}

const SOURCE_SCORES: Record<string, number> = {
  REFERRAL: 20,
  WEBSITE: 15,
  ORGANIC: 12,
  LINKEDIN: 14,
  COLD_CALL: 8,
  EVENTS: 10,
  PARTNER: 18,
  OTHER: 5,
};

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  async scoreLead(tenantId: string, leadId: string): Promise<LeadScoreResult> {
    const prismaAny = this.prisma as any;

    const lead = await prismaAny.lead.findFirst({
      where: { id: leadId, tenantId, deletedAt: null },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true, size: true, industry: true } },
        activities: {
          select: { id: true, type: true, createdAt: true },
          where: { deletedAt: null },
        },
        conversations: { select: { id: true, status: true, createdAt: true } },
        tasks: { select: { id: true, status: true, completedAt: true } },
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    const breakdown = this.calculateBreakdown(lead);
    const classification = this.getClassification(breakdown.total);
    const factors = this.explainFactors(lead, breakdown);

    await prismaAny.leadScoreHistory.create({
      data: {
        leadId,
        score: breakdown.total,
        breakdown,
        reason: factors.join('; '),
        tenantId,
      },
    });

    await prismaAny.lead.update({
      where: { id: leadId },
      data: { score: breakdown.total },
    });

    return {
      leadId,
      score: breakdown.total,
      classification,
      breakdown,
      factors,
    };
  }

  async scoreAllLeads(tenantId: string): Promise<{ scored: number; errors: number }> {
    const prismaAny = this.prisma as any;
    const leads = await prismaAny.lead.findMany({
      where: { tenantId, deletedAt: null, status: { notIn: ['CONVERTED', 'LOST'] } },
      select: { id: true },
    });

    let scored = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        await this.scoreLead(tenantId, lead.id);
        scored++;
      } catch {
        errors++;
      }
    }

    return { scored, errors };
  }

  async getScoreHistory(tenantId: string, leadId: string, limit = 20) {
    const prismaAny = this.prisma as any;
    return prismaAny.leadScoreHistory.findMany({
      where: { tenantId, leadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLeadsByScore(tenantId: string, classification: string, limit = 20) {
    const prismaAny = this.prisma as any;
    const ranges = this.getClassificationRange(classification);

    return prismaAny.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ['CONVERTED', 'LOST'] },
        score: { gte: ranges.min, lte: ranges.max },
      },
      include: { owner: { select: { firstName: true, lastName: true } } },
      orderBy: { score: 'desc' },
      take: limit,
    });
  }

  async getScoreStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const leads = await prismaAny.lead.findMany({
      where: { tenantId, deletedAt: null, status: { notIn: ['CONVERTED', 'LOST'] } },
      select: { score: true },
    });

    const scored = leads.filter((l: any) => l.score != null);
    const avgScore =
      scored.length > 0
        ? scored.reduce((sum: number, l: any) => sum + l.score, 0) / scored.length
        : 0;

    const classifications = { frio: 0, morno: 0, interessado: 0, quente: 0, muitoQuente: 0 };
    for (const lead of scored) {
      const c = this.getClassification(lead.score);
      classifications[c as keyof typeof classifications]++;
    }

    return {
      totalLeads: leads.length,
      scoredLeads: scored.length,
      avgScore: Math.round(avgScore),
      classifications,
      hotLeads: classifications.quente + classifications.muitoQuente,
      coldLeads: classifications.frio,
    };
  }

  private calculateBreakdown(lead: any): LeadScoreBreakdown {
    const source = this.scoreSource(lead.source);
    const engagement = this.scoreEngagement(lead);
    const company = this.scoreCompany(lead.company);
    const recency = this.scoreRecency(lead);
    const completeness = this.scoreCompleteness(lead);
    const activities = this.scoreActivities(lead.activities);
    const conversations = this.scoreConversations(lead.conversations);

    const total = Math.min(
      100,
      Math.round(
        source * 0.15 +
          engagement * 0.25 +
          company * 0.1 +
          recency * 0.15 +
          completeness * 0.1 +
          activities * 0.15 +
          conversations * 0.1,
      ),
    );

    return { source, engagement, company, recency, completeness, activities, conversations, total };
  }

  private scoreSource(source: string): number {
    return SOURCE_SCORES[source] || 5;
  }

  private scoreEngagement(lead: any): number {
    let score = 0;
    if (lead.email) score += 10;
    if (lead.phone) score += 10;
    if (lead.position) score += 10;
    if (lead.companyName) score += 5;
    if (lead.description && lead.description.length > 20) score += 5;
    return Math.min(40, score);
  }

  private scoreCompany(company: any): number {
    if (!company) return 0;
    let score = 10;
    if (company.size === 'enterprise') score += 15;
    else if (company.size === 'mid-market') score += 10;
    else if (company.size === 'small') score += 5;
    if (company.industry) score += 5;
    return Math.min(30, score);
  }

  private scoreRecency(lead: any): number {
    if (!lead.updatedAt) return 0;
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(lead.updatedAt).getTime()) / 86400000,
    );
    if (daysSinceUpdate <= 1) return 30;
    if (daysSinceUpdate <= 3) return 25;
    if (daysSinceUpdate <= 7) return 20;
    if (daysSinceUpdate <= 14) return 15;
    if (daysSinceUpdate <= 30) return 10;
    return 5;
  }

  private scoreCompleteness(lead: any): number {
    let filled = 0;
    const total = 8;
    if (lead.firstName) filled++;
    if (lead.lastName) filled++;
    if (lead.email) filled++;
    if (lead.phone) filled++;
    if (lead.companyName) filled++;
    if (lead.position) filled++;
    if (lead.source) filled++;
    if (lead.description) filled++;
    return Math.round((filled / total) * 25);
  }

  private scoreActivities(activities: any[]): number {
    if (!activities || activities.length === 0) return 0;
    const count = activities.length;
    if (count >= 10) return 25;
    if (count >= 5) return 20;
    if (count >= 3) return 15;
    if (count >= 1) return 10;
    return 0;
  }

  private scoreConversations(conversations: any[]): number {
    if (!conversations || conversations.length === 0) return 0;
    const active = conversations.filter((c) => c.status === 'active' || c.status === 'open').length;
    if (active >= 3) return 25;
    if (active >= 2) return 20;
    if (active >= 1) return 15;
    return 10;
  }

  private getClassification(score: number): string {
    if (score <= 20) return 'frio';
    if (score <= 40) return 'morno';
    if (score <= 60) return 'interessado';
    if (score <= 80) return 'quente';
    return 'muitoQuente';
  }

  private getClassificationRange(classification: string) {
    const ranges: Record<string, { min: number; max: number }> = {
      frio: { min: 0, max: 20 },
      morno: { min: 21, max: 40 },
      interessado: { min: 41, max: 60 },
      quente: { min: 61, max: 80 },
      muitoQuente: { min: 81, max: 100 },
    };
    return ranges[classification] || ranges.frio;
  }

  private explainFactors(lead: any, breakdown: LeadScoreBreakdown): string[] {
    const factors: string[] = [];
    if (breakdown.source >= 15) factors.push('Lead de alta qualidade (referral/parceiro)');
    if (breakdown.engagement >= 25) factors.push('Boa informação de contato');
    if (breakdown.company >= 20) factors.push('Empresa de porte significativo');
    if (breakdown.recency >= 20) factors.push('Lead recente e ativo');
    if (breakdown.activities >= 15) factors.push('Múltiplas interações registradas');
    if (breakdown.conversations >= 15) factors.push('Conversas ativas');
    if (breakdown.total <= 20) factors.push('Lead com baixo engajamento');
    if (breakdown.total >= 80) factors.push('Lead com alto potencial de conversão');
    return factors;
  }
}
