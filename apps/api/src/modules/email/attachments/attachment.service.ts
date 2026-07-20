import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageAdapter } from '../../../infrastructure/storage/storage.adapter';
import { AttachmentValidator, AttachmentInput, ValidatedAttachment } from './attachment-validator';
import * as path from 'path';

export interface AttachmentRecord {
  id: string;
  filename: string;
  mimeType: string | null;
  size: number;
  checksum: string | null;
  storageKey: string;
  storageProvider: string;
  contentId: string | null;
}

export interface ProcessAttachmentResult {
  record: AttachmentRecord;
  warnings: string[];
}

export interface AttachmentLimits {
  maxFileSize: number;
  maxAttachmentsPerEmail: number;
  maxTotalBytesPerEmail: number;
}

const DEFAULT_ATTACHMENT_LIMITS: AttachmentLimits = {
  maxFileSize: 25 * 1024 * 1024,
  maxAttachmentsPerEmail: 25,
  maxTotalBytesPerEmail: 100 * 1024 * 1024,
};

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);
  private readonly validator: AttachmentValidator;
  private readonly limits: AttachmentLimits;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('StorageAdapter') private readonly storage: StorageAdapter,
  ) {
    this.validator = new AttachmentValidator();
    this.limits = { ...DEFAULT_ATTACHMENT_LIMITS };
  }

  configureLimits(limits: Partial<AttachmentLimits>): void {
    Object.assign(this.limits, limits);
  }

  async processAttachment(
    tenantId: string,
    messageId: string,
    input: AttachmentInput,
  ): Promise<ProcessAttachmentResult> {
    if (input.size > this.limits.maxFileSize) {
      throw new Error(
        `Attachment size ${input.size} exceeds max ${this.limits.maxFileSize}`,
      );
    }

    const validated = this.validator.validate(input);

    const storageKey = this.buildStorageKey(tenantId, messageId, validated.safeFilename);

    const existing = await this.findExisting(tenantId, messageId, validated.safeFilename, validated.checksum);
    if (existing) {
      this.logger.debug(
        `Attachment already exists: filename=${validated.safeFilename} checksum=${validated.checksum.substring(0, 8)}`,
      );
      return {
        record: existing,
        warnings: ['duplicate_ignored'],
      };
    }

    await this.storage.put(storageKey, validated.content, {
      mimeType: validated.contentType,
    });

    const record = await this.prisma.messageAttachment.create({
      data: {
        tenantId,
        messageId,
        filename: validated.safeFilename,
        mimeType: validated.contentType,
        size: validated.size,
        checksum: validated.checksum,
        storageKey,
        storageProvider: 'local',
        contentId: input.contentId || null,
        type: input.inline ? 'inline' : 'file',
        metadata: JSON.stringify({
          originalFilename: input.filename,
          inline: input.inline || false,
        }),
      },
    });

    this.logger.log(
      `Attachment stored: id=${record.id} filename=${validated.safeFilename} size=${validated.size} key=${storageKey}`,
    );

    return {
      record: {
        id: record.id,
        filename: record.filename,
        mimeType: record.mimeType,
        size: record.size,
        checksum: record.checksum,
        storageKey: record.storageKey,
        storageProvider: record.storageProvider,
        contentId: record.contentId,
      },
      warnings: validated.warnings,
    };
  }

  async processAttachments(
    tenantId: string,
    messageId: string,
    inputs: AttachmentInput[],
  ): Promise<ProcessAttachmentResult[]> {
    if (inputs.length > this.limits.maxAttachmentsPerEmail) {
      this.logger.warn(
        `Attachment count ${inputs.length} exceeds limit ${this.limits.maxAttachmentsPerEmail} for message=${messageId}`,
      );
      inputs = inputs.slice(0, this.limits.maxAttachmentsPerEmail);
    }

    const results: ProcessAttachmentResult[] = [];
    let totalBytes = 0;

    for (const input of inputs) {
      if (totalBytes + input.size > this.limits.maxTotalBytesPerEmail) {
        this.logger.warn(
          `Total bytes limit ${this.limits.maxTotalBytesPerEmail} reached for message=${messageId} at attachment=${input.filename}`,
        );
        break;
      }

      try {
        const result = await this.processAttachment(tenantId, messageId, input);
        results.push(result);
        totalBytes += input.size;
      } catch (error: any) {
        this.logger.warn(
          `Failed to process attachment: filename=${input.filename} error=${error.message}`,
        );
      }
    }

    return results;
  }

  async getAttachment(
    tenantId: string,
    attachmentId: string,
  ): Promise<{ record: any; data: Buffer } | null> {
    const record = await this.prisma.messageAttachment.findFirst({
      where: { id: attachmentId, tenantId },
    });

    if (!record) return null;

    const data = await this.storage.get(record.storageKey);
    if (!data) {
      this.logger.warn(`Attachment data not found in storage: key=${record.storageKey}`);
      return null;
    }

    return { record, data };
  }

  async getAttachmentByKey(
    tenantId: string,
    storageKey: string,
  ): Promise<{ record: any; data: Buffer } | null> {
    const record = await this.prisma.messageAttachment.findFirst({
      where: { storageKey, tenantId },
    });

    if (!record) return null;

    const data = await this.storage.get(record.storageKey);
    if (!data) return null;

    return { record, data };
  }

  private async findExisting(
    tenantId: string,
    messageId: string,
    filename: string,
    checksum: string,
  ): Promise<AttachmentRecord | null> {
    const existing = await this.prisma.messageAttachment.findFirst({
      where: {
        tenantId,
        messageId,
        filename,
        checksum,
      },
    });

    if (!existing) return null;

    return {
      id: existing.id,
      filename: existing.filename,
      mimeType: existing.mimeType,
      size: existing.size,
      checksum: existing.checksum,
      storageKey: existing.storageKey,
      storageProvider: existing.storageProvider,
      contentId: existing.contentId,
    };
  }

  private buildStorageKey(tenantId: string, messageId: string, filename: string): string {
    const date = new Date();
    const ym = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const hash = filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 50);
    return `${tenantId}/emails/${messageId}/${ym}/${hash}`;
  }
}
