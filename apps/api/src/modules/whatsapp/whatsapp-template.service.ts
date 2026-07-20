import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';

export interface SyncTemplatesResult {
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

@Injectable()
export class WhatsAppTemplateService {
  private readonly logger = new Logger(WhatsAppTemplateService.name);
  private static readonly META_API_VERSION = 'v21.0';
  private static readonly META_API_BASE = 'https://graph.facebook.com';

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async getTemplates(
    tenantId: string,
    dto?: { status?: string; category?: string; language?: string },
  ) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (dto?.status) where.status = dto.status;
    if (dto?.category) where.category = dto.category;
    if (dto?.language) where.language = dto.language;

    return prismaAny.whatsAppTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getTemplate(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    const template = await prismaAny.whatsAppTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!template) throw new BadRequestException('Template not found');
    return template;
  }

  async createTemplate(
    tenantId: string,
    dto: {
      name: string;
      language?: string;
      category?: string;
      components?: any;
      variables?: string[];
    },
  ) {
    const prismaAny = this.prisma as any;

    const existing = await prismaAny.whatsAppTemplate.findFirst({
      where: { name: dto.name, language: dto.language || 'pt_BR', tenantId },
    });

    if (existing) {
      throw new BadRequestException('Template with this name and language already exists');
    }

    return prismaAny.whatsAppTemplate.create({
      data: {
        name: dto.name,
        language: dto.language || 'pt_BR',
        category: dto.category || 'UTILITY',
        status: 'DRAFT',
        components: dto.components || undefined,
        variables: dto.variables || undefined,
        tenantId,
      },
    });
  }

  async updateTemplate(
    tenantId: string,
    id: string,
    dto: {
      name?: string;
      language?: string;
      category?: string;
      components?: any;
      variables?: string[];
      status?: string;
    },
  ) {
    const prismaAny = this.prisma as any;
    const template = await prismaAny.whatsAppTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!template) throw new BadRequestException('Template not found');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.language !== undefined) data.language = dto.language;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.components !== undefined) data.components = dto.components;
    if (dto.variables !== undefined) data.variables = dto.variables;
    if (dto.status !== undefined) data.status = dto.status;

    return prismaAny.whatsAppTemplate.update({
      where: { id },
      data,
    });
  }

  async deleteTemplate(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.whatsAppTemplate.deleteMany({ where: { id, tenantId } });
    return { success: true };
  }

  async syncTemplatesFromMeta(tenantId: string): Promise<SyncTemplatesResult> {
    const prismaAny = this.prisma as any;
    const result: SyncTemplatesResult = { synced: 0, created: 0, updated: 0, errors: [] };

    const channel = await prismaAny.channel.findFirst({
      where: { type: 'WHATSAPP', tenantId },
    });

    if (!channel) {
      result.errors.push('WhatsApp channel not configured');
      return result;
    }

    const credentials = channel.credentials as Record<string, unknown>;
    let accessToken: string;
    if (this.encryptionService.isAvailable() && credentials.accessToken) {
      accessToken = this.encryptionService.decrypt(credentials.accessToken as string);
    } else {
      accessToken = credentials.accessToken as string;
    }

    const wabaId = credentials.wabaId as string;
    if (!accessToken || !wabaId) {
      result.errors.push('Access token or WABA ID not configured');
      return result;
    }

    try {
      const url = `${WhatsAppTemplateService.META_API_BASE}/${WhatsAppTemplateService.META_API_VERSION}/${wabaId}/message_templates`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const error = (await response.json()) as any;
        result.errors.push(error.error?.message || 'Failed to fetch templates from Meta');
        return result;
      }

      const data = (await response.json()) as any;
      const templates = data.data || [];

      for (const metaTemplate of templates) {
        try {
          const existing = await prismaAny.whatsAppTemplate.findFirst({
            where: { name: metaTemplate.name, language: metaTemplate.language, tenantId },
          });

          const templateData = {
            externalId: metaTemplate.id,
            name: metaTemplate.name,
            language: metaTemplate.language,
            category: metaTemplate.category,
            status: metaTemplate.status,
            components: metaTemplate.components || undefined,
            tenantId,
          };

          if (existing) {
            await prismaAny.whatsAppTemplate.update({
              where: { id: existing.id },
              data: templateData,
            });
            result.updated++;
          } else {
            await prismaAny.whatsAppTemplate.create({ data: templateData });
            result.created++;
          }
          result.synced++;
        } catch (e: any) {
          result.errors.push(`Failed to sync template ${metaTemplate.name}: ${e.message}`);
        }
      }
    } catch (e: any) {
      result.errors.push(`Meta API error: ${e.message}`);
    }

    this.logger.log(
      `Templates synced for tenant=${tenantId}: synced=${result.synced} created=${result.created} updated=${result.updated} errors=${result.errors.length}`,
    );
    return result;
  }

  async sendTemplateMessage(
    tenantId: string,
    userId: string,
    dto: {
      to: string;
      templateName: string;
      language?: string;
      variables?: Record<string, string>;
      components?: any[];
    },
  ) {
    const prismaAny = this.prisma as any;

    const template = await prismaAny.whatsAppTemplate.findFirst({
      where: { name: dto.templateName, tenantId, status: { not: 'REJECTED' } },
    });

    if (!template) {
      throw new BadRequestException('Template not found or rejected');
    }

    const channel = await prismaAny.channel.findFirst({
      where: { type: 'WHATSAPP', tenantId },
    });

    if (!channel) {
      throw new BadRequestException('WhatsApp channel not configured');
    }

    const credentials = channel.credentials as Record<string, unknown>;
    let accessToken: string;
    if (this.encryptionService.isAvailable() && credentials.accessToken) {
      accessToken = this.encryptionService.decrypt(credentials.accessToken as string);
    } else {
      accessToken = credentials.accessToken as string;
    }

    const phoneNumberId = credentials.phoneNumberId as string;

    const languageCode = dto.language || template.language;

    const bodyParams = dto.variables
      ? Object.entries(dto.variables).map(([_key, value]) => ({ type: 'text', text: value }))
      : [];

    const templatePayload: any = {
      name: dto.templateName,
      language: { code: languageCode },
    };

    if (bodyParams.length > 0 || dto.components) {
      templatePayload.components = dto.components || [{ type: 'body', parameters: bodyParams }];
    }

    const url = `${WhatsAppTemplateService.META_API_BASE}/${WhatsAppTemplateService.META_API_VERSION}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: dto.to,
        type: 'template',
        template: templatePayload,
      }),
    });

    const result = (await response.json()) as any;

    if (!response.ok) {
      throw new BadRequestException(result.error?.message || 'Failed to send template message');
    }

    const metaMessages = result.messages as any[];
    const externalId = metaMessages?.[0]?.id;

    const conversation = await prismaAny.conversation.findFirst({
      where: { tenantId, channel: 'WHATSAPP', contactId: undefined },
    });

    const message = await prismaAny.message.create({
      data: {
        content: `[Template: ${dto.templateName}]`,
        direction: 'OUTBOUND',
        channel: 'WHATSAPP',
        messageType: 'template',
        externalId,
        conversationId: conversation?.id || '',
        senderId: userId,
        status: 'sent',
        metadata: JSON.stringify({
          to: dto.to,
          phoneNumberId,
          templateName: dto.templateName,
          language: languageCode,
        }),
        tenantId,
      },
    });

    return {
      messageId: message.id,
      externalId,
      status: 'sent',
    };
  }

  async getStatistics(tenantId: string) {
    const prismaAny = this.prisma as any;

    const [totalTemplates, byStatus, byCategory] = await Promise.all([
      prismaAny.whatsAppTemplate.count({ where: { tenantId } }),
      prismaAny.whatsAppTemplate.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      prismaAny.whatsAppTemplate.groupBy({ by: ['category'], where: { tenantId }, _count: true }),
    ]);

    return {
      totalTemplates,
      byStatus: byStatus.map((s: any) => ({ status: s.status, count: s._count })),
      byCategory: byCategory.map((c: any) => ({ category: c.category, count: c._count })),
    };
  }
}
