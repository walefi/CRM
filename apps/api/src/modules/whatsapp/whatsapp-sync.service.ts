import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';

export interface SyncResult {
  conversations: number;
  messages: number;
  contacts: number;
  errors: string[];
}

@Injectable()
export class WhatsAppSyncService {
  private readonly logger = new Logger(WhatsAppSyncService.name);
  private static readonly META_API_VERSION = 'v21.0';
  private static readonly META_API_BASE = 'https://graph.facebook.com';

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async syncConversationHistory(
    tenantId: string,
    phoneNumberId: string,
    _contactPhone: string,
  ): Promise<SyncResult> {
    const result: SyncResult = { conversations: 0, messages: 0, contacts: 0, errors: [] };

    const credentials = await this.getDecryptedCredentials(tenantId);
    if (!credentials?.accessToken) {
      result.errors.push('Access token not configured');
      return result;
    }

    try {
      const url = `${WhatsAppSyncService.META_API_BASE}/${WhatsAppSyncService.META_API_VERSION}/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      if (!response.ok) {
        const error = (await response.json()) as any;
        result.errors.push(error.error?.message || 'Failed to sync');
        return result;
      }

      const data = (await response.json()) as any;
      const messages = data.data || [];

      const prismaAny = this.prisma as any;

      for (const msg of messages) {
        try {
          const existing = await prismaAny.message.findFirst({
            where: { externalId: msg.id, tenantId, channel: 'WHATSAPP' },
          });

          if (!existing) {
            const direction = msg.from === phoneNumberId ? 'OUTBOUND' : 'INBOUND';
            await prismaAny.message.create({
              data: {
                content: msg.text?.body || `[${msg.type}]`,
                direction,
                channel: 'WHATSAPP',
                messageType: msg.type || 'text',
                externalId: msg.id,
                conversationId: '',
                status: 'synced',
                metadata: JSON.stringify(msg),
                tenantId,
                createdAt: new Date(parseInt(msg.timestamp) * 1000),
              },
            });
            result.messages++;
          }
        } catch (e: any) {
          result.errors.push(`Failed to sync message ${msg.id}: ${e.message}`);
        }
      }
    } catch (e: any) {
      result.errors.push(`Sync error: ${e.message}`);
    }

    this.logger.log(
      `Sync completed for tenant=${tenantId}: messages=${result.messages} errors=${result.errors.length}`,
    );
    return result;
  }

  async syncTemplates(tenantId: string): Promise<{ synced: number; errors: string[] }> {
    const result = { synced: 0, errors: [] as string[] };

    const credentials = await this.getDecryptedCredentials(tenantId);
    const wabaId = credentials?.wabaId as string;

    if (!credentials?.accessToken || !wabaId) {
      result.errors.push('Credentials not configured');
      return result;
    }

    try {
      const url = `${WhatsAppSyncService.META_API_BASE}/${WhatsAppSyncService.META_API_VERSION}/${wabaId}/message_templates`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      if (!response.ok) {
        const error = (await response.json()) as any;
        result.errors.push(error.error?.message || 'Failed to fetch templates');
        return result;
      }

      const data = (await response.json()) as any;
      const templates = data.data || [];
      const prismaAny = this.prisma as any;

      for (const t of templates) {
        try {
          await prismaAny.whatsAppTemplate.upsert({
            where: { name_language_tenantId: { name: t.name, language: t.language, tenantId } },
            create: {
              externalId: t.id,
              name: t.name,
              language: t.language,
              category: t.category,
              status: t.status,
              components: t.components || undefined,
              tenantId,
            },
            update: {
              externalId: t.id,
              category: t.category,
              status: t.status,
              components: t.components || undefined,
            },
          });
          result.synced++;
        } catch (e: any) {
          result.errors.push(`Template ${t.name}: ${e.message}`);
        }
      }
    } catch (e: any) {
      result.errors.push(`Sync error: ${e.message}`);
    }

    return result;
  }

  async getSyncStatus(tenantId: string) {
    const prismaAny = this.prisma as any;

    const [totalMessages, lastMessage, totalTemplates, lastTemplate] = await Promise.all([
      prismaAny.message.count({ where: { tenantId, channel: 'WHATSAPP' } }),
      prismaAny.message.findFirst({
        where: { tenantId, channel: 'WHATSAPP' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prismaAny.whatsAppTemplate.count({ where: { tenantId } }),
      prismaAny.whatsAppTemplate.findFirst({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

    return {
      totalMessages,
      lastMessageAt: lastMessage?.createdAt || null,
      totalTemplates,
      lastTemplateSyncAt: lastTemplate?.updatedAt || null,
    };
  }

  private async getDecryptedCredentials(tenantId: string): Promise<Record<string, unknown> | null> {
    const prismaAny = this.prisma as any;
    const channel = await prismaAny.channel.findFirst({
      where: { type: 'WHATSAPP', tenantId },
    });
    if (!channel?.credentials) return null;

    const credentials = channel.credentials as Record<string, unknown>;
    if (this.encryptionService.isAvailable()) {
      return this.encryptionService.decryptObject(credentials, Object.keys(credentials));
    }
    return credentials;
  }
}
