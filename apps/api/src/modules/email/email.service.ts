import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import {
  MessageCreatedEvent,
  MessageSentEvent,
  MessageFailedEvent,
} from '../../infrastructure/event-bus/domain-events';
import { SendEmailDto, CreateEmailAccountDto } from './dto/send-email.dto';
import { SmtpEmailAdapter } from './adapters/smtp-email.adapter';
import { EmailProviderAdapter, SendEmailOptions } from './adapters/email-provider.adapter';

export interface EmailJobData {
  messageId: string;
  tenantId: string;
  userId: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  static readonly QUEUE_NAME = 'email-send';

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly queueService: QueueService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async sendEmail(tenantId: string, userId: string, dto: SendEmailDto) {
    if (!dto.to || dto.to.length === 0) {
      throw new BadRequestException('At least one recipient is required');
    }

    if (!dto.html && !dto.text) {
      throw new BadRequestException('Email body (html or text) is required');
    }

    const account = await this.resolveEmailAccount(tenantId, dto.emailAccountId);

    const conversation = dto.conversationId
      ? await this.resolveConversation(tenantId, dto.conversationId)
      : await this.createEmailConversation(tenantId, userId, dto, account);

    const message = await this.prisma.message.create({
      data: {
        content: dto.text || dto.html,
        direction: 'OUTBOUND',
        channel: 'EMAIL',
        messageType: dto.html ? 'html' : 'text',
        conversationId: conversation.id,
        senderId: userId,
        senderName: account.displayName || account.email,
        status: 'pending',
        metadata: JSON.stringify({
          subject: dto.subject,
          to: dto.to,
          cc: dto.cc,
          bcc: dto.bcc,
          from: `${account.fromName || account.displayName || ''} <${account.fromEmail || account.email}>`,
          replyTo: dto.replyTo,
          hasAttachments: dto.attachments && dto.attachments.length > 0,
          emailAccountId: account.id,
        }),
        tenantId,
      },
    });

    try {
      await this.eventBus.publish(new MessageCreatedEvent(
        { ...message, conversationId: conversation.id, direction: 'OUTBOUND' },
        tenantId,
        userId,
      ));
    } catch (error: any) {
      this.logger.warn(`Failed to publish message.created event: ${error.message}`);
    }

    await this.queueService.addJob(
      EmailService.QUEUE_NAME,
      'send-email',
      {
        messageId: message.id,
        tenantId,
        userId,
      } as EmailJobData,
      {
        jobId: `email-${message.id}`,
        attempts: 5,
        priority: 1,
      },
    );

    this.logger.log(
      `Email queued: messageId=${message.id} to=${dto.to.join(',')} subject="${dto.subject}"`,
    );

    return {
      messageId: message.id,
      conversationId: conversation.id,
      status: 'queued',
    };
  }

  async processSendEmail(jobData: EmailJobData): Promise<void> {
    const { messageId, tenantId } = jobData;

    const message = await this.prisma.message.findUnique({
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

    const metadata = typeof message.metadata === 'string'
      ? JSON.parse(message.metadata)
      : (message.metadata as Record<string, unknown>) || {};
    const emailAccountId = metadata.emailAccountId as string;

    const account = await this.resolveEmailAccount(tenantId, emailAccountId);
    const decryptedPassword = this.encryptionService.isAvailable()
      ? this.encryptionService.decrypt(account.password)
      : account.password;

    const adapter: EmailProviderAdapter = new SmtpEmailAdapter({
      host: account.host,
      port: account.port,
      secure: account.secure,
      username: account.username,
      password: decryptedPassword,
    });

    const sendOptions: SendEmailOptions = {
      from: `${account.fromName || account.displayName || ''} <${account.fromEmail || account.email}>`.trim(),
      to: metadata.to as string[],
      cc: metadata.cc as string[] | undefined,
      bcc: metadata.bcc as string[] | undefined,
      subject: metadata.subject as string,
      text: message.direction === 'OUTBOUND' ? message.content || undefined : undefined,
      html: message.direction === 'OUTBOUND' ? undefined : undefined,
      replyTo: metadata.replyTo as string | undefined,
    };

    if (message.content && metadata.subject) {
      sendOptions.html = message.content;
      sendOptions.text = undefined;
    }

    try {
      const result = await adapter.send(sendOptions);

      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'sent',
          externalId: result.messageId,
          deliveredAt: new Date(),
        },
      });

      await this.prisma.emailAccount.update({
        where: { id: account.id },
        data: { lastUsedAt: new Date() },
      });

      try {
        await this.eventBus.publish(new MessageSentEvent(
          { ...message, status: 'sent', externalId: result.messageId },
          tenantId,
          jobData.userId,
        ));
      } catch (error: any) {
        this.logger.warn(`Failed to publish message.sent event: ${error.message}`);
      }

      this.logger.log(
        `Email sent: messageId=${messageId} externalId=${result.messageId} to=${(metadata.to as string[]).join(',')}`,
      );
    } catch (error: any) {
      const isTemporary = this.isTemporaryError(error);

      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'failed',
          metadata: JSON.stringify({
            ...metadata,
            error: error.message,
            errorCode: error.code,
            isTemporary,
            failedAt: new Date().toISOString(),
          }),
        },
      });

      try {
        await this.eventBus.publish(new MessageFailedEvent(
          { ...message, status: 'failed', error: error.message },
          tenantId,
          jobData.userId,
        ));
      } catch (publishError: any) {
        this.logger.warn(`Failed to publish message.failed event: ${publishError.message}`);
      }

      this.logger.error(
        `Email failed: messageId=${messageId} error="${error.message}" temporary=${isTemporary}`,
      );

      if (isTemporary) {
        throw error;
      }
    }
  }

  async sendEmailFromAccount(
    tenantId: string,
    accountId: string,
    options: SendEmailOptions,
  ): Promise<{ messageId: string }> {
    const account = await this.prisma.emailAccount.findFirst({
      where: { id: accountId, tenantId, isActive: true },
    });
    if (!account) throw new NotFoundException(`Email account ${accountId} not found`);

    const decryptedPassword = this.encryptionService.isAvailable()
      ? this.encryptionService.decrypt(account.password)
      : account.password;

    const adapter = new SmtpEmailAdapter({
      host: account.host,
      port: account.port,
      secure: account.secure,
      username: account.username,
      password: decryptedPassword,
    });

    const result = await adapter.send(options);

    await this.prisma.emailAccount.update({
      where: { id: accountId },
      data: { lastUsedAt: new Date() },
    });

    return { messageId: result.messageId };
  }

  async getAccounts(tenantId: string) {
    return this.prisma.emailAccount.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        email: true,
        displayName: true,
        provider: true,
        host: true,
        port: true,
        secure: true,
        fromName: true,
        fromEmail: true,
        isActive: true,
        isDefault: true,
        status: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  async createAccount(tenantId: string, dto: CreateEmailAccountDto) {
    const encryptedPassword = this.encryptionService.isAvailable()
      ? this.encryptionService.encrypt(dto.password)
      : dto.password;

    if (dto.isDefault) {
      await this.prisma.emailAccount.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.emailAccount.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        host: dto.host,
        port: dto.port,
        secure: dto.secure,
        username: dto.username,
        password: encryptedPassword,
        fromName: dto.fromName,
        fromEmail: dto.fromEmail || dto.email,
        isDefault: dto.isDefault || false,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        provider: true,
        host: true,
        port: true,
        secure: true,
        fromName: true,
        fromEmail: true,
        isActive: true,
        isDefault: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async deleteAccount(tenantId: string, accountId: string) {
    const account = await this.prisma.emailAccount.findFirst({
      where: { id: accountId, tenantId },
    });
    if (!account) throw new NotFoundException(`Email account ${accountId} not found`);

    await this.prisma.emailAccount.delete({ where: { id: accountId } });
  }

  async testAccount(tenantId: string, accountId: string, recipientEmail: string) {
    const account = await this.prisma.emailAccount.findFirst({
      where: { id: accountId, tenantId, isActive: true },
    });
    if (!account) throw new NotFoundException(`Email account ${accountId} not found`);

    const decryptedPassword = this.encryptionService.isAvailable()
      ? this.encryptionService.decrypt(account.password)
      : account.password;

    const adapter = new SmtpEmailAdapter({
      host: account.host,
      port: account.port,
      secure: account.secure,
      username: account.username,
      password: decryptedPassword,
    });

    const result = await adapter.send({
      from: `${account.fromName || account.displayName || ''} <${account.fromEmail || account.email}>`.trim(),
      to: [recipientEmail],
      subject: 'CRM - Teste de configuração de email',
      text: 'Este é um email de teste do CRM Enterprise. Se você recebeu este email, a configuração está funcionando corretamente.',
      html: '<p>Este é um email de teste do CRM Enterprise. Se você recebeu este email, a configuração está funcionando corretamente.</p>',
    });

    return { success: true, messageId: result.messageId };
  }

  private async resolveEmailAccount(tenantId: string, accountId?: string) {
    if (accountId) {
      const account = await this.prisma.emailAccount.findFirst({
        where: { id: accountId, tenantId, isActive: true },
      });
      if (!account) throw new NotFoundException(`Email account ${accountId} not found`);
      return account;
    }

    const defaultAccount = await this.prisma.emailAccount.findFirst({
      where: { tenantId, isActive: true, isDefault: true },
    });
    if (defaultAccount) return defaultAccount;

    const anyAccount = await this.prisma.emailAccount.findFirst({
      where: { tenantId, isActive: true },
    });
    if (!anyAccount) {
      throw new BadRequestException(
        'No email account configured. Please create an email account first.',
      );
    }
    return anyAccount;
  }

  private async resolveConversation(tenantId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
    });
    if (!conv) throw new NotFoundException(`Conversation ${conversationId} not found`);
    return conv;
  }

  private async createEmailConversation(
    tenantId: string,
    userId: string,
    dto: SendEmailDto,
    account: { id: string; email: string; displayName?: string | null },
  ) {
    const contactEmail = dto.to[0];
    let contactId = dto.contactId;

    if (!contactId) {
      const contact = await this.prisma.contact.findFirst({
        where: { tenantId, email: contactEmail },
      });
      if (contact) contactId = contact.id;
    }

    return this.prisma.conversation.create({
      data: {
        subject: dto.subject,
        channel: 'EMAIL',
        status: 'active',
        priority: 'normal',
        contactId,
        lastMessageAt: new Date(),
        lastMessagePreview: dto.subject,
        tenantId,
        userId,
      },
    });
  }

  private isTemporaryError(error: any): boolean {
    const temporaryCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'EAI_AGAIN',
      'EBUSY',
      'EAGAIN',
      'SOCKET_TIMEOUT',
      'TEXT_ECONNRESET',
    ];

    if (temporaryCodes.includes(error.code)) return true;

    const temporaryPatterns = [
      /timeout/i,
      /connection.*refused/i,
      /temporarily.*unavailable/i,
      /try.*again/i,
      /rate.*limit/i,
      /too.*many.*requests/i,
    ];

    return temporaryPatterns.some((pattern) => pattern.test(error.message));
  }
}
