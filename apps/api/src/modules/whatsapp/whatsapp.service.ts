import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import {
  MessageCreatedEvent,
  MessageSentEvent,
  MessageReceivedEvent,
  MessageDeliveredEvent,
  MessageFailedEvent,
} from '../../infrastructure/event-bus/domain-events';
import { SendWhatsAppMessageDto, WhatsAppConfigDto } from './dto/whatsapp.dto';

export interface WhatsAppJobData {
  messageId: string;
  tenantId: string;
  phoneNumberId: string;
  to: string;
  text: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  static readonly QUEUE_NAME = 'whatsapp-send';
  private static readonly META_API_VERSION = 'v21.0';
  private static readonly META_API_BASE = 'https://graph.facebook.com';

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly queueService: QueueService,
    private readonly encryptionService: EncryptionService,
  ) {}

  // ── Config ──────────────────────────────────────────────────────────

  async getConfig(tenantId: string) {
    const channel = await (this.prisma as any).channel.findFirst({
      where: { type: 'WHATSAPP', tenantId },
    });
    if (!channel) return null;

    const credentials = (channel.credentials as Record<string, unknown>) || {};
    return {
      id: channel.id,
      phoneNumberId: (credentials.phoneNumberId as string) || '',
      wabaId: (credentials.wabaId as string) || '',
      appId: (credentials.appId as string) || '',
      verifyToken: (credentials.verifyToken as string) || '',
      isConnected: channel.isConnected,
      isActive: channel.isActive,
      webhookUrl: channel.webhookUrl,
    };
  }

  async saveConfig(tenantId: string, dto: WhatsAppConfigDto) {
    const credentialsToStore: Record<string, unknown> = {
      appId: dto.appId,
      appSecret: dto.appSecret,
      phoneNumberId: dto.phoneNumberId,
      wabaId: dto.wabaId,
      verifyToken: dto.verifyToken,
      accessToken: dto.accessToken,
    };

    const encryptedCredentials = this.encryptionService.isAvailable()
      ? this.encryptionService.encryptObject(credentialsToStore, Object.keys(credentialsToStore))
      : credentialsToStore;

    const webhookSecret = this.encryptionService.isAvailable()
      ? this.encryptionService.encrypt(dto.appSecret)
      : dto.appSecret;

    const channel = await (this.prisma as any).channel.upsert({
      where: { type_tenantId: { type: 'WHATSAPP', tenantId } },
      create: {
        type: 'WHATSAPP',
        name: 'WhatsApp Business',
        credentials: encryptedCredentials,
        webhookSecret,
        isActive: true,
        isConnected: true,
        healthScore: 'healthy',
        tenantId,
      },
      update: {
        credentials: encryptedCredentials,
        webhookSecret,
        isActive: true,
        isConnected: true,
        healthScore: 'healthy',
      },
    });

    this.logger.log(
      `WhatsApp config saved for tenant=${tenantId} phoneNumberId=${dto.phoneNumberId}`,
    );
    return { id: channel.id, phoneNumberId: dto.phoneNumberId, wabaId: dto.wabaId };
  }

  // ── Webhook Verification (GET) ──────────────────────────────────────

  async verifyWebhook(
    tenantId: string,
    mode: string,
    token: string,
    challenge: string,
  ): Promise<string> {
    if (mode !== 'subscribe') {
      throw new BadRequestException('Invalid hub.mode');
    }

    const config = await this.getConfig(tenantId);
    if (!config) {
      throw new NotFoundException('WhatsApp channel not configured');
    }

    const storedToken =
      this.encryptionService.isAvailable() && this.isEncrypted(config.verifyToken)
        ? this.encryptionService.decrypt(config.verifyToken)
        : config.verifyToken;

    if (token !== storedToken) {
      throw new UnauthorizedException('Invalid verify token');
    }

    this.logger.log(`Webhook verified for tenant=${tenantId}`);
    return challenge;
  }

  // ── Process Incoming Message ─────────────────────────────────────────

  async processIncomingMessage(
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<{ messageId: string; conversationId: string; contactId: string | null }> {
    const entry = (payload.entry as any[])?.[0];
    const changes = entry?.changes as any[];
    const value = changes?.[0]?.value;

    if (!value) {
      throw new BadRequestException('Invalid WhatsApp webhook payload');
    }

    const messages = value.messages as any[];
    const contacts = value.contacts as any[];
    const metadata = value.metadata as Record<string, string>;

    if (!messages || messages.length === 0) {
      return { messageId: '', conversationId: '', contactId: null };
    }

    const msg = messages[0];
    const contact = contacts?.[0];

    const phoneNumberId = metadata?.phone_number_id;
    const from = msg.from;
    const waId = contact?.wa_id;
    const pushName = contact?.profile?.name;

    // Find or create contact
    const crmContact = await this.findOrCreateContact(tenantId, from, pushName, waId);

    // Find or create conversation
    const conversation = await this.findOrCreateConversation(
      tenantId,
      phoneNumberId,
      crmContact?.id,
    );

    // Create message
    const externalId = msg.id;
    const existing = await (this.prisma as any).message.findFirst({
      where: { externalId, tenantId, channel: 'WHATSAPP' },
    });
    if (existing) {
      return {
        messageId: existing.id,
        conversationId: conversation.id,
        contactId: crmContact?.id || null,
      };
    }

    const messageContent = this.extractMessageContent(msg);
    const message = await (this.prisma as any).message.create({
      data: {
        content: messageContent.text,
        direction: 'INBOUND',
        channel: 'WHATSAPP',
        messageType: messageContent.type,
        externalId,
        conversationId: conversation.id,
        senderId: null,
        senderName: pushName || from,
        status: 'received',
        metadata: JSON.stringify({
          from,
          phoneNumberId,
          waId,
          pushName,
          type: msg.type,
          timestamp: msg.timestamp,
          rawMessage: msg,
        }),
        tenantId,
      },
    });

    await (this.prisma as any).conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(parseInt(msg.timestamp) * 1000),
        lastMessagePreview: (messageContent.text || '').substring(0, 100),
        unreadCount: { increment: 1 },
      },
    });

    // Update lead lastInteractionAt if linked
    if (crmContact?.leadId) {
      try {
        await (this.prisma as any).lead.update({
          where: { id: crmContact.leadId },
          data: { lastInteractionAt: new Date() },
        });
      } catch (e: any) {
        this.logger.warn(`Failed to update lead lastInteractionAt: ${e.message}`);
      }
    }

    // Publish event
    try {
      await this.eventBus.publish(
        new MessageReceivedEvent(
          { ...message, conversationId: conversation.id, direction: 'INBOUND' },
          tenantId,
        ),
      );
    } catch (e: any) {
      this.logger.warn(`Failed to publish message.received event: ${e.message}`);
    }

    this.logger.log(`WhatsApp message received: id=${message.id} from=${from} tenant=${tenantId}`);

    return {
      messageId: message.id,
      conversationId: conversation.id,
      contactId: crmContact?.id || null,
    };
  }

  // ── Process Status Update ────────────────────────────────────────────

  async processStatusUpdate(tenantId: string, payload: Record<string, unknown>): Promise<void> {
    const entry = (payload.entry as any[])?.[0];
    const changes = entry?.changes as any[];
    const value = changes?.[0]?.value;

    if (!value?.statuses) return;

    for (const status of value.statuses) {
      const externalId = status.id;
      const statusValue = status.status; // sent, delivered, read, played, error

      const message = await (this.prisma as any).message.findFirst({
        where: { externalId, tenantId, channel: 'WHATSAPP' },
      });

      if (!message) continue;

      const updateData: Record<string, unknown> = {};
      if (statusValue === 'delivered') updateData.deliveredAt = new Date();
      if (statusValue === 'read') updateData.readAt = new Date();
      if (statusValue === 'sent') updateData.status = 'sent';
      if (statusValue === 'failed') updateData.status = 'failed';

      if (Object.keys(updateData).length > 0) {
        await (this.prisma as any).message.update({
          where: { id: message.id },
          data: updateData,
        });

        if (statusValue === 'delivered') {
          try {
            await this.eventBus.publish(
              new MessageDeliveredEvent(
                { ...message, conversationId: message.conversationId },
                tenantId,
              ),
            );
          } catch (e: any) {
            this.logger.warn(`Failed to publish message.delivered event: ${e.message}`);
          }
        }
      }
    }
  }

  // ── Send Message ─────────────────────────────────────────────────────

  async sendMessage(tenantId: string, userId: string, dto: SendWhatsAppMessageDto) {
    const config = await this.getConfig(tenantId);
    if (!config || !config.isConnected) {
      throw new BadRequestException('WhatsApp channel not configured or disconnected');
    }

    const phoneNumberId = dto.phoneNumberId || config.phoneNumberId;
    if (!phoneNumberId) {
      throw new BadRequestException('Phone Number ID is required');
    }

    // Resolve conversation
    let conversationId = dto.conversationId;
    if (!conversationId) {
      const conversation = await this.findOrCreateConversation(tenantId, phoneNumberId);
      conversationId = conversation.id;
    }

    // Create message record
    const message = await (this.prisma as any).message.create({
      data: {
        content: dto.text,
        direction: 'OUTBOUND',
        channel: 'WHATSAPP',
        messageType: 'text',
        conversationId,
        senderId: userId,
        status: 'pending',
        metadata: JSON.stringify({
          to: dto.to,
          phoneNumberId,
        }),
        tenantId,
      },
    });

    try {
      await this.eventBus.publish(
        new MessageCreatedEvent(
          { ...message, conversationId, direction: 'OUTBOUND' },
          tenantId,
          userId,
        ),
      );
    } catch (e: any) {
      this.logger.warn(`Failed to publish message.created event: ${e.message}`);
    }

    // Queue for async send
    await this.queueService.addJob(
      WhatsAppService.QUEUE_NAME,
      'send-whatsapp',
      {
        messageId: message.id,
        tenantId,
        phoneNumberId,
        to: dto.to,
        text: dto.text,
      } as WhatsAppJobData,
      {
        jobId: `whatsapp-${message.id}`,
        attempts: 5,
        priority: 1,
      },
    );

    this.logger.log(`WhatsApp message queued: messageId=${message.id} to=${dto.to}`);

    return {
      messageId: message.id,
      conversationId,
      status: 'queued',
    };
  }

  // ── Process Send (BullMQ Worker) ────────────────────────────────────

  async processSendJob(jobData: WhatsAppJobData): Promise<void> {
    const { messageId, tenantId, phoneNumberId, to, text } = jobData;

    const message = await (this.prisma as any).message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      this.logger.error(`Message not found: ${messageId}`);
      return;
    }

    if (message.status !== 'pending') {
      this.logger.debug(`Message ${messageId} already processed (status=${message.status})`);
      return;
    }

    const config = await this.getConfig(tenantId);
    if (!config) {
      await this.markMessageFailed(messageId, tenantId, 'WhatsApp channel not configured');
      return;
    }

    const credentials = await this.getDecryptedCredentials(tenantId);
    const accessToken = credentials?.accessToken as string;

    if (!accessToken) {
      await this.markMessageFailed(messageId, tenantId, 'Access token not configured');
      return;
    }

    try {
      const metaApiUrl = `${WhatsAppService.META_API_BASE}/${WhatsAppService.META_API_VERSION}/${phoneNumberId}/messages`;

      const response = await fetch(metaApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      });

      const result = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        const errorMessage = (result.error as any)?.message || 'Unknown Meta API error';
        this.logger.error(`Meta API error: ${errorMessage}`, result);
        await this.markMessageFailed(messageId, tenantId, errorMessage);
        return;
      }

      const metaMessages = result.messages as any[];
      const externalId = metaMessages?.[0]?.id;

      await (this.prisma as any).message.update({
        where: { id: messageId },
        data: {
          status: 'sent',
          externalId: externalId || undefined,
        },
      });

      try {
        await this.eventBus.publish(
          new MessageSentEvent(
            { ...message, conversationId: message.conversationId, direction: 'OUTBOUND' },
            tenantId,
          ),
        );
      } catch (e: any) {
        this.logger.warn(`Failed to publish message.sent event: ${e.message}`);
      }

      this.logger.log(`WhatsApp message sent: messageId=${messageId} metaId=${externalId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`);
      await this.markMessageFailed(messageId, tenantId, error.message);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async markMessageFailed(messageId: string, tenantId: string, reason: string) {
    await (this.prisma as any).message.update({
      where: { id: messageId },
      data: { status: 'failed' },
    });

    try {
      const message = await (this.prisma as any).message.findUnique({ where: { id: messageId } });
      await this.eventBus.publish(
        new MessageFailedEvent(
          { ...message, conversationId: message?.conversationId, reason },
          tenantId,
        ),
      );
    } catch (e: any) {
      this.logger.warn(`Failed to publish message.failed event: ${e.message}`);
    }
  }

  private async findOrCreateContact(tenantId: string, phone: string, name?: string, waId?: string) {
    // Try to find existing contact by phone
    const existing = await (this.prisma as any).contact.findFirst({
      where: {
        tenantId,
        OR: [{ phone: phone }, { email: phone }],
      },
    });

    if (existing) {
      // Link to lead if exists
      const lead = await (this.prisma as any).lead.findFirst({
        where: { tenantId, contactId: existing.id },
        select: { id: true },
      });
      return { ...existing, leadId: lead?.id || null };
    }

    // Create new contact
    const newContact = await (this.prisma as any).contact.create({
      data: {
        firstName: name || phone,
        phone,
        metadata: JSON.stringify({ whatsappWaId: waId }),
        tenantId,
      },
    });

    this.logger.log(`Contact created from WhatsApp: id=${newContact.id} phone=${phone}`);
    return { ...newContact, leadId: null };
  }

  private async findOrCreateConversation(
    tenantId: string,
    phoneNumberId: string,
    contactId?: string,
  ) {
    // Try to find existing active WhatsApp conversation for this contact
    if (contactId) {
      const existing = await (this.prisma as any).conversation.findFirst({
        where: {
          tenantId,
          channel: 'WHATSAPP',
          contactId,
          status: { in: ['active', 'assigned', 'waiting'] },
        },
      });
      if (existing) return existing;
    }

    // Create new conversation
    return (this.prisma as any).conversation.create({
      data: {
        channel: 'WHATSAPP',
        subject: 'WhatsApp Conversation',
        status: 'active',
        priority: 'normal',
        tags: ['whatsapp'],
        contactId,
        metadata: JSON.stringify({ phoneNumberId }),
        tenantId,
      },
    });
  }

  private extractMessageContent(msg: Record<string, unknown>): { text: string; type: string } {
    const type = msg.type as string;

    switch (type) {
      case 'text':
        return { text: (msg.text as any)?.body || '', type: 'text' };
      case 'image':
        return { text: '[Image]', type: 'image' };
      case 'video':
        return { text: '[Video]', type: 'video' };
      case 'audio':
        return { text: '[Audio]', type: 'audio' };
      case 'document':
        return {
          text: `[Document: ${(msg.document as any)?.filename || 'file'}]`,
          type: 'document',
        };
      case 'location':
        return { text: '[Location]', type: 'location' };
      case 'sticker':
        return { text: '[Sticker]', type: 'sticker' };
      case 'reaction':
        return { text: (msg.reaction as any)?.emoji || '[Reaction]', type: 'reaction' };
      default:
        return { text: `[${type}]`, type: type || 'unknown' };
    }
  }

  private async getDecryptedCredentials(tenantId: string): Promise<Record<string, unknown> | null> {
    const channel = await (this.prisma as any).channel.findFirst({
      where: { type: 'WHATSAPP', tenantId },
    });
    if (!channel?.credentials) return null;

    const credentials = channel.credentials as Record<string, unknown>;
    if (this.encryptionService.isAvailable()) {
      return this.encryptionService.decryptObject(credentials, Object.keys(credentials));
    }
    return credentials;
  }

  private isEncrypted(value: string): boolean {
    try {
      const decoded = Buffer.from(value, 'base64');
      return decoded.length > 48;
    } catch {
      return false;
    }
  }
}
