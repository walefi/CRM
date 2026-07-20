import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import {
  MessageReceivedEvent,
  MessageCreatedEvent,
} from '../../infrastructure/event-bus/domain-events';
import {
  IncomingEmailPayload,
  IngestEmailResult,
} from './dto/incoming-email.dto';
import { AttachmentService } from './attachments/attachment.service';

@Injectable()
export class EmailReceiverService {
  private readonly logger = new Logger(EmailReceiverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    @Optional() private readonly attachmentService?: AttachmentService,
  ) {}

  async receiveEmail(
    tenantId: string,
    email: IncomingEmailPayload,
  ): Promise<IngestEmailResult> {
    const normalizedFrom = this.normalizeEmail(email.from.address);
    if (!normalizedFrom) {
      return {
        messageId: '',
        conversationId: '',
        contactId: null,
        status: 'error',
        reason: 'invalid_sender',
      };
    }

    const externalMessageId =
      email.providerMessageId || email.messageId || this.generateFallbackMessageId(email, tenantId);

    let result: any;
    try {
      result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.message.findFirst({
        where: {
          externalId: externalMessageId,
          tenantId,
          channel: 'EMAIL',
        },
        select: { id: true, conversationId: true },
      });

      if (existing) {
        return {
          messageId: existing.id,
          conversationId: existing.conversationId,
          contactId: null,
          status: 'duplicate' as const,
        };
      }

      const contact = await this.findContactByEmail(tenantId, normalizedFrom);

      const conversation = await this.findOrCreateConversation(
        tx,
        tenantId,
        email,
        contact?.id,
      );

      const message = await tx.message.create({
        data: {
          content: email.htmlBody || email.textBody || '',
          direction: 'INBOUND',
          channel: 'EMAIL',
          messageType: email.htmlBody ? 'html' : 'text',
          externalId: externalMessageId,
          conversationId: conversation.id,
          senderId: null,
          senderName: email.from.name || email.from.address,
          status: 'received',
          metadata: JSON.stringify({
            provider: email.provider,
            subject: email.subject,
            from: email.from.address,
            fromName: email.from.name,
            to: email.to.map((r) => r.address),
            cc: email.cc?.map((r) => r.address),
            bcc: email.bcc?.map((r) => r.address),
            replyTo: email.replyTo?.address,
            inReplyTo: email.inReplyTo,
            references: email.references,
            hasAttachments: email.attachments && email.attachments.length > 0,
            attachmentCount: email.attachments?.length || 0,
            receivedAt: email.receivedAt.toISOString(),
            headers: email.headers,
            emailAccountId: email.emailAccountId,
          }),
          tenantId,
        },
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: email.receivedAt,
          lastMessagePreview: (email.textBody || email.subject || '').substring(0, 100),
          unreadCount: { increment: 1 },
        },
      });

      return {
        messageId: message.id,
        conversationId: conversation.id,
        contactId: contact?.id || null,
        status: 'processed' as const,
        message,
        conversation,
      };
    });
    } catch (error: any) {
      const sanitizedReason = error.message?.replace(/[:=].*$/g, ': [REDACTED]').substring(0, 200) || 'unknown_error';
      this.logger.error(`Transaction failed: ${error.message?.split(':')[0] || 'unknown'}`);
      return {
        messageId: '',
        conversationId: '',
        contactId: null,
        status: 'error',
        reason: `transaction_failed: ${sanitizedReason}`,
      };
    }

    if (result.status === 'duplicate') {
      this.logger.debug(`Duplicate email ignored: ${externalMessageId}`);
      return result;
    }

    if ((result as any).status === 'error') {
      return result;
    }

    const { message, conversation } = result as any;

    try {
      await this.eventBus.publish(
        new MessageCreatedEvent(
          { ...message, conversationId: conversation.id, direction: 'INBOUND' },
          tenantId,
        ),
      );
    } catch (error: any) {
      this.logger.warn(`Failed to publish message.created event: ${error.message}`);
    }

    try {
      await this.eventBus.publish(
        new MessageReceivedEvent(
          { ...message, conversationId: conversation.id, direction: 'INBOUND' },
          tenantId,
        ),
      );
    } catch (error: any) {
      this.logger.warn(`Failed to publish message.received event: ${error.message}`);
    }

    this.logger.log(
      `Email received: messageId=${message.id} from=${normalizedFrom} subject="${email.subject}" conversation=${conversation.id}`,
    );

    const attachmentResults = await this.processAttachments(tenantId, message.id, email);

    return {
      messageId: message.id,
      conversationId: conversation.id,
      contactId: result.contactId,
      status: 'processed',
      attachmentResults,
    };
  }

  private async processAttachments(
    tenantId: string,
    messageId: string,
    email: IncomingEmailPayload,
  ): Promise<IngestEmailResult['attachmentResults']> {
    if (!email.attachments || email.attachments.length === 0 || !this.attachmentService) {
      return undefined;
    }

    try {
      const results = await this.attachmentService.processAttachments(
        tenantId,
        messageId,
        email.attachments,
      );

      return results.map((r) => ({
        filename: r.record.filename,
        status: r.warnings.includes('duplicate_ignored') ? 'skipped' as const : 'stored' as const,
        warning: r.warnings.filter((w) => w !== 'duplicate_ignored').join(', ') || undefined,
      }));
    } catch (error: any) {
      this.logger.warn(`Failed to process attachments: ${error.message}`);
      return email.attachments.map((a) => ({
        filename: a.filename,
        status: 'error' as const,
        warning: error.message,
      }));
    }
  }

  private async findContactByEmail(tenantId: string, email: string) {
    return this.prisma.contact.findFirst({
      where: { tenantId, email, deletedAt: null },
    });
  }

  private async findOrCreateConversation(
    tx: any,
    tenantId: string,
    email: IncomingEmailPayload,
    contactId?: string,
  ): Promise<{ id: string }> {
    if (email.inReplyTo) {
      const threaded = await tx.message.findFirst({
        where: {
          externalId: email.inReplyTo,
          tenantId,
          channel: 'EMAIL',
        },
        select: { conversationId: true },
      });
      if (threaded) {
        const conv = await tx.conversation.findUnique({
          where: { id: threaded.conversationId },
          select: { id: true },
        });
        if (conv) return conv;
      }
    }

    if (email.references && email.references.length > 0) {
      for (const ref of email.references) {
        const refMsg = await tx.message.findFirst({
          where: {
            externalId: ref,
            tenantId,
            channel: 'EMAIL',
          },
          select: { conversationId: true },
        });
        if (refMsg) {
          const conv = await tx.conversation.findUnique({
            where: { id: refMsg.conversationId },
            select: { id: true },
          });
          if (conv) return conv;
        }
      }
    }

    if (contactId) {
      const existing = await tx.conversation.findFirst({
        where: {
          tenantId,
          contactId,
          channel: 'EMAIL',
          status: { not: 'archived' },
          subject: this.normalizeSubject(email.subject),
        },
        orderBy: { lastMessageAt: 'desc' },
      });
      if (existing) return existing;
    }

    return tx.conversation.create({
      data: {
        subject: email.subject,
        channel: 'EMAIL',
        status: 'active',
        priority: 'normal',
        contactId,
        lastMessageAt: email.receivedAt,
        lastMessagePreview: (email.textBody || email.subject || '').substring(0, 100),
        tenantId,
      },
    });
  }

  private normalizeEmail(email: string): string | null {
    const cleaned = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(cleaned) ? cleaned : null;
  }

  private normalizeSubject(subject: string): string {
    return subject
      .replace(/^(re:|fw:|fwd:|回复:|转发:)\s*/gi, '')
      .trim()
      .toLowerCase();
  }

  private generateFallbackMessageId(
    email: IncomingEmailPayload,
    tenantId: string,
  ): string {
    const crypto = require('crypto');
    const content = `${tenantId}:${email.from.address}:${email.to[0]?.address || ''}:${email.subject}:${email.receivedAt.toISOString()}`;
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `fallback-${hash.substring(0, 32)}`;
  }
}
