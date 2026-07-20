import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageAdapter } from '../../../infrastructure/storage/storage.adapter';

export enum ReconciliationIssueType {
  ORPHAN_FILE = 'orphan_file',
  ORPHAN_RECORD = 'orphan_record',
  CHECKSUM_MISMATCH = 'checksum_mismatch',
  MISSING_FILE = 'missing_file',
}

export interface ReconciliationIssue {
  type: ReconciliationIssueType;
  tenantId: string;
  attachmentId?: string;
  storageKey?: string;
  filename?: string;
  detectedAt: Date;
}

export interface ReconciliationResult {
  scanned: number;
  issues: ReconciliationIssue[];
  orphanFiles: number;
  orphanRecords: number;
  checksumMismatches: number;
  missingFiles: number;
  durationMs: number;
}

@Injectable()
export class StorageReconciliationService {
  private readonly logger = new Logger(StorageReconciliationService.name);
  private readonly PAGE_SIZE = 100;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('StorageAdapter') private readonly storage: StorageAdapter,
  ) {}

  async reconcile(
    tenantId?: string,
    limit: number = 1000,
    dryRun: boolean = true,
  ): Promise<ReconciliationResult> {
    const startTime = Date.now();
    const issues: ReconciliationIssue[] = [];
    let scanned = 0;
    let offset = 0;

    this.logger.log(
      `Starting storage reconciliation: tenant=${tenantId || 'all'} limit=${limit} dryRun=${dryRun}`,
    );

    while (scanned < limit) {
      const batchSize = Math.min(this.PAGE_SIZE, limit - scanned);

      const where: any = {};
      if (tenantId) where.tenantId = tenantId;

      const records = await this.prisma.messageAttachment.findMany({
        where,
        skip: offset,
        take: batchSize,
        orderBy: { createdAt: 'asc' },
      });

      if (records.length === 0) break;

      for (const record of records) {
        const fileExists = await this.storage.exists(record.storageKey);

        if (!fileExists) {
          issues.push({
            type: ReconciliationIssueType.MISSING_FILE,
            tenantId: record.tenantId,
            attachmentId: record.id,
            storageKey: record.storageKey,
            filename: record.filename,
            detectedAt: new Date(),
          });
        }

        scanned++;
      }

      offset += records.length;

      if (records.length < batchSize) break;
    }

    const orphanFiles = issues.filter((i) => i.type === ReconciliationIssueType.ORPHAN_FILE).length;
    const orphanRecords = issues.filter((i) => i.type === ReconciliationIssueType.ORPHAN_RECORD).length;
    const checksumMismatches = issues.filter((i) => i.type === ReconciliationIssueType.CHECKSUM_MISMATCH).length;
    const missingFiles = issues.filter((i) => i.type === ReconciliationIssueType.MISSING_FILE).length;

    const result: ReconciliationResult = {
      scanned,
      issues,
      orphanFiles,
      orphanRecords,
      checksumMismatches,
      missingFiles,
      durationMs: Date.now() - startTime,
    };

    this.logger.log(
      `Reconciliation complete: scanned=${scanned} issues=${issues.length} ` +
      `missingFiles=${missingFiles} duration=${result.durationMs}ms`,
    );

    if (!dryRun && issues.length > 0) {
      this.logger.warn(
        `Dry run mode — ${issues.length} issues detected but NOT remediated.`,
      );
    }

    return result;
  }

  async markMissingAttachments(
    tenantId?: string,
    limit: number = 100,
  ): Promise<{ marked: number }> {
    let marked = 0;
    let offset = 0;

    while (marked < limit) {
      const batchSize = Math.min(this.PAGE_SIZE, limit - marked);

      const where: any = {};
      if (tenantId) where.tenantId = tenantId;

      const records = await this.prisma.messageAttachment.findMany({
        where,
        skip: offset,
        take: batchSize,
        orderBy: { createdAt: 'asc' },
      });

      if (records.length === 0) break;

      for (const record of records) {
        const fileExists = await this.storage.exists(record.storageKey);
        if (!fileExists) {
          const currentMeta = typeof record.metadata === 'object' && record.metadata !== null
            ? record.metadata as Record<string, any>
            : {};

          await this.prisma.messageAttachment.update({
            where: { id: record.id },
            data: {
              metadata: {
                ...currentMeta,
                missing: true,
                missingDetectedAt: new Date().toISOString(),
              },
            },
          });
          marked++;
        }
      }

      offset += records.length;

      if (records.length < batchSize) break;
    }

    this.logger.log(`Marked ${marked} attachments as missing`);
    return { marked };
  }
}
