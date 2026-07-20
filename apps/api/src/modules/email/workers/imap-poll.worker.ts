import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EncryptionService } from '../../../infrastructure/encryption/encryption.service';
import { EmailReceiverService } from '../email-receiver.service';
import { SimpleImapAdapter } from '../adapters/simple-imap.adapter';
import { ImapMessage } from '../adapters/imap-email.adapter';

export interface ImapPollJobData {
  tenantId: string;
  emailAccountId: string;
}

export enum ImapErrorType {
  TRANSIENT = 'transient',
  PERMANENT = 'permanent',
}

export interface ImapPollMetrics {
  processed: number;
  errors: number;
  duplicates: number;
  skippedBacklog: number;
  bytesReceived: number;
  bytesStored: number;
  attachmentsProcessed: number;
  attachmentsRejected: number;
  durationMs: number;
}

interface ImapWorkerState {
  lastPollAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
  consecutiveErrors: number;
  totalProcessed: number;
  totalErrors: number;
}

@Injectable()
export class ImapPollWorker implements OnModuleInit {
  private readonly logger = new Logger(ImapPollWorker.name);
  static readonly QUEUE_NAME = 'email-imap-poll';
  static readonly CRONJOB_NAME = 'imap-poll-scheduler';

  private readonly pollIntervalMs: number;
  private readonly connectionTimeout: number;
  private readonly authTimeout: number;
  private readonly maxMessagesPerPoll: number;
  private readonly maxBytesPerPoll: number;

  private readonly workerState: ImapWorkerState = {
    lastPollAt: null,
    lastErrorAt: null,
    lastError: null,
    consecutiveErrors: 0,
    totalProcessed: 0,
    totalErrors: 0,
  };

  constructor(
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly receiverService: EmailReceiverService,
    private readonly configService: ConfigService,
  ) {
    this.pollIntervalMs = this.configService.get<number>('IMAP_POLL_INTERVAL_MS', 300000);
    this.connectionTimeout = this.configService.get<number>('IMAP_CONN_TIMEOUT_MS', 10000);
    this.authTimeout = this.configService.get<number>('IMAP_AUTH_TIMEOUT_MS', 5000);
    this.maxMessagesPerPoll = this.configService.get<number>('IMAP_MAX_MESSAGES_PER_POLL', 100);
    this.maxBytesPerPoll = this.configService.get<number>('IMAP_MAX_BYTES_PER_POLL', 50 * 1024 * 1024);
  }

  onModuleInit() {
    this.registerWorker();
    this.logger.log(
      `ImapPollWorker registered (pollInterval=${this.pollIntervalMs}ms maxMsg=${this.maxMessagesPerPoll} maxBytes=${this.maxBytesPerPoll})`,
    );
  }

  getState(): Readonly<ImapWorkerState> {
    return { ...this.workerState };
  }

  private registerWorker(): void {
    this.queueService.registerWorker(
      ImapPollWorker.QUEUE_NAME,
      async (job) => {
        const data = job.data as ImapPollJobData;
        this.logger.debug(
          `Processing IMAP poll: tenant=${data.tenantId} account=${data.emailAccountId}`,
        );
        await this.processPoll(data);
      },
      { concurrency: 2 },
    );
  }

  async processPoll(data: ImapPollJobData): Promise<ImapPollMetrics> {
    const startTime = Date.now();
    const { tenantId, emailAccountId } = data;
    let processed = 0;
    let errors = 0;
    let duplicates = 0;
    let skippedBacklog = 0;
    let bytesReceived = 0;
    let bytesStored = 0;
    let attachmentsProcessed = 0;
    const attachmentsRejected = 0;

    this.workerState.lastPollAt = new Date();

    const account = await this.prisma.emailAccount.findFirst({
      where: { id: emailAccountId, tenantId, isActive: true },
    });
    if (!account) {
      this.logger.warn(
        `Email account ${emailAccountId} not found or inactive (tenant=${tenantId})`,
      );
      return this.buildMetrics(startTime, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    const imapConfig = this.getImapConfig(account);
    if (!imapConfig) {
      this.logger.debug(`No IMAP config for account ${emailAccountId}`);
      return this.buildMetrics(startTime, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    const adapter = new SimpleImapAdapter(imapConfig);

    try {
      await adapter.connect();
      const allMessages = await adapter.fetchUnseen();

      const totalFound = allMessages.length;
      const messages = allMessages.slice(0, this.maxMessagesPerPoll);
      skippedBacklog = totalFound - messages.length;

      if (skippedBacklog > 0) {
        this.logger.warn(
          `IMAP backlog detected: account=${account.email} total=${totalFound} processing=${messages.length} backlog=${skippedBacklog}`,
        );
      }

      this.logger.log(
        `IMAP poll: account=${account.email} uidValidity=${adapter.uidValidity} found=${totalFound} processing=${messages.length}`,
      );

      let bytesAccumulated = 0;
      let hitByteLimit = false;

      for (const msg of messages) {
        const msgBytes = this.estimateMessageBytes(msg);
        bytesReceived += msgBytes;

        if (bytesAccumulated + msgBytes > this.maxBytesPerPoll && processed > 0) {
          this.logger.warn(
            `IMAP byte limit reached: account=${account.email} accumulated=${bytesAccumulated} limit=${this.maxBytesPerPoll} remaining=${totalFound - processed - duplicates - errors} deferred`,
          );
          skippedBacklog += totalFound - processed - duplicates - errors;
          hitByteLimit = true;
          break;
        }

        try {
          const result = await this.processMessage(
            tenantId,
            emailAccountId,
            msg,
            account.email,
          );

          if (result.status === 'processed') {
            await adapter.markAsRead(msg.uid);
            processed++;
            bytesAccumulated += msgBytes;
            bytesStored += msgBytes;
            attachmentsProcessed += result.attachmentCount || 0;
          } else if (result.status === 'duplicate') {
            await adapter.markAsRead(msg.uid);
            duplicates++;
            bytesAccumulated += msgBytes;
          }
        } catch (error: any) {
          errors++;
          const errorType = this.classifyError(error);
          this.logger.error(
            `Failed to process IMAP message uid=${msg.uid} uidValidity=${msg.uidValidity} account=${account.email} type=${errorType}: ${error.message?.split(':')[0] || 'unknown'}`,
          );

          if (errorType === ImapErrorType.PERMANENT) {
            this.logger.warn(
              `Permanent error on uid=${msg.uid} — will not retry: ${error.message?.split(':')[0]}`,
            );
          }
        }
      }

      if (!hitByteLimit) {
        this.workerState.consecutiveErrors = 0;
      }
    } catch (error: any) {
      const errorType = this.classifyError(error);
      this.workerState.consecutiveErrors++;
      this.workerState.lastErrorAt = new Date();
      this.workerState.lastError = error.message?.split(':')[0] || 'unknown';

      this.logger.error(
        `IMAP poll failed for account=${account.email} host=${imapConfig.host} type=${errorType} consecutive=${this.workerState.consecutiveErrors}: ${error.message?.split(':')[0] || 'unknown'}`,
      );

      if (errorType === ImapErrorType.PERMANENT) {
        this.logger.warn(
          `Permanent IMAP error — not retrying via BullMQ: ${error.message?.split(':')[0]}`,
        );
        return this.buildMetrics(startTime, processed, errors, duplicates, skippedBacklog, bytesReceived, bytesStored, attachmentsProcessed, attachmentsRejected);
      }

      if (this.workerState.consecutiveErrors >= 5) {
        this.logger.error(
          `IMAP poll aborting after ${this.workerState.consecutiveErrors} consecutive errors — manual intervention may be required`,
        );
      }

      throw error;
    } finally {
      await adapter.disconnect();
    }

    this.workerState.totalProcessed += processed;
    this.workerState.totalErrors += errors;

    const metrics = this.buildMetrics(
      startTime,
      processed,
      errors,
      duplicates,
      skippedBacklog,
      bytesReceived,
      bytesStored,
      attachmentsProcessed,
      attachmentsRejected,
    );

    if (processed > 0 || errors > 0 || skippedBacklog > 0) {
      this.logger.log(
        `IMAP poll complete: account=${account.email} processed=${processed} duplicates=${duplicates} errors=${errors} backlog=${skippedBacklog} bytes=${bytesReceived} duration=${metrics.durationMs}ms`,
      );
    }

    return metrics;
  }

  classifyError(error: any): ImapErrorType {
    const message = (error.message || '').toLowerCase();
    const code = (error.code || '').toUpperCase();

    const permanentPatterns = [
      'invalid credentials',
      'authentication failed',
      'login failed',
      'mailbox does not exist',
      'mailbox not found',
      'invalid mailbox',
      'no such mailbox',
      'permission denied',
      'access denied',
      'invalid user',
      'account disabled',
      'certificate',
      'ssl',
      'tls',
    ];

    const transientPatterns = [
      'timeout',
      'timed out',
      'econnreset',
      'econnrefused',
      'enotfound',
      'eai_again',
      'connection refused',
      'connection closed',
      'socket hang up',
      'epipe',
      'eagain',
      'temporary',
      'try again',
      'unavailable',
      'service unavailable',
      'too many connections',
      'rate limit',
    ];

    for (const pattern of permanentPatterns) {
      if (message.includes(pattern)) return ImapErrorType.PERMANENT;
    }

    for (const pattern of transientPatterns) {
      if (message.includes(pattern)) return ImapErrorType.TRANSIENT;
    }

    if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
      return ImapErrorType.TRANSIENT;
    }

    return ImapErrorType.TRANSIENT;
  }

  private async processMessage(
    tenantId: string,
    emailAccountId: string,
    msg: ImapMessage,
    accountEmail: string,
  ): Promise<{ status: 'processed' | 'duplicate' | 'error'; attachmentCount: number }> {
    const result = await this.receiverService.receiveEmail(tenantId, {
      provider: 'imap',
      providerMessageId: msg.messageId,
      messageId: msg.messageId,
      inReplyTo: msg.inReplyTo,
      references: msg.references,
      from: msg.from,
      to: msg.to,
      cc: msg.cc,
      bcc: msg.bcc,
      replyTo: msg.replyTo,
      subject: msg.subject,
      textBody: msg.text,
      htmlBody: msg.html,
      receivedAt: msg.date,
      headers: msg.headers,
      attachments: msg.attachments?.map((a) => ({
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
        content: a.content,
        contentId: a.contentId,
        inline: a.inline,
      })),
      emailAccountId,
      tenantId,
    });

    if (result.status === 'duplicate') {
      this.logger.debug(
        `Duplicate IMAP message ignored uid=${msg.uid} messageId=${msg.messageId} account=${accountEmail}`,
      );
      return { status: 'duplicate', attachmentCount: 0 };
    }

    if (result.status === 'error') {
      this.logger.warn(
        `IMAP message processing error uid=${msg.uid} account=${accountEmail} reason=${result.reason}`,
      );
      return { status: 'error', attachmentCount: 0 };
    }

    const attachmentCount = result.attachmentResults?.length || 0;
    return { status: 'processed', attachmentCount };
  }

  private estimateMessageBytes(msg: ImapMessage): number {
    let bytes = 0;
    if (msg.text) bytes += Buffer.byteLength(msg.text, 'utf8');
    if (msg.html) bytes += Buffer.byteLength(msg.html, 'utf8');
    if (msg.subject) bytes += Buffer.byteLength(msg.subject, 'utf8');
    if (msg.attachments) {
      for (const att of msg.attachments) {
        bytes += att.size || (att.content ? att.content.length : 0);
      }
    }
    return bytes || 1024;
  }

  private buildMetrics(
    startTime: number,
    processed: number,
    errors: number,
    duplicates: number,
    skippedBacklog: number,
    bytesReceived: number,
    bytesStored: number,
    attachmentsProcessed: number,
    attachmentsRejected: number,
  ): ImapPollMetrics {
    return {
      processed,
      errors,
      duplicates,
      skippedBacklog,
      bytesReceived,
      bytesStored,
      attachmentsProcessed,
      attachmentsRejected,
      durationMs: Date.now() - startTime,
    };
  }

  private getImapConfig(account: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    metadata?: unknown;
  }): { host: string; port: number; secure: boolean; username: string; password: string } | null {
    const metadata = typeof account.metadata === 'string'
      ? JSON.parse(account.metadata)
      : account.metadata;

    const imapHost = (metadata as Record<string, unknown>)?.imapHost as string;
    if (!imapHost) return null;

    const password = this.encryptionService.isAvailable()
      ? this.encryptionService.decrypt(account.password)
      : account.password;

    return {
      host: imapHost,
      port: ((metadata as Record<string, unknown>)?.imapPort as number) || 993,
      secure: ((metadata as Record<string, unknown>)?.imapSecure as boolean) ?? true,
      username: (metadata as Record<string, unknown>)?.imapUsername as string || account.username,
      password,
    };
  }
}
