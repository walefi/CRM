import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface AttachmentInput {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
  contentId?: string;
  inline?: boolean;
}

export interface ValidatedAttachment extends AttachmentInput {
  checksum: string;
  safeFilename: string;
  warnings: string[];
}

export interface AttachmentValidationConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  blockedExtensions: string[];
  blockedMimeTypes: string[];
}

const DEFAULT_CONFIG: AttachmentValidationConfig = {
  maxFileSize: 25 * 1024 * 1024,
  allowedMimeTypes: [],
  blockedExtensions: ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif', '.vbs', '.js', '.ws', '.wsh', '.ps1', '.sh', '.bash'],
  blockedMimeTypes: [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-bat',
    'application/x-cmd',
    'application/x-com',
    'application/x-msi',
    'application/xscr',
    'application/x-pif',
    'text/x-script',
    'text/x-vbs',
    'text/x-javascript',
    'text/x-shellscript',
  ],
};

export class AttachmentValidator {
  private readonly logger = new Logger(AttachmentValidator.name);
  private readonly config: AttachmentValidationConfig;

  constructor(config?: Partial<AttachmentValidationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  validate(attachment: AttachmentInput): ValidatedAttachment {
    const warnings: string[] = [];
    const safeFilename = this.sanitizeFilename(attachment.filename);

    if (attachment.size > this.config.maxFileSize) {
      throw new Error(
        `Attachment size ${attachment.size} exceeds max ${this.config.maxFileSize}`,
      );
    }

    const ext = this.getExtension(safeFilename).toLowerCase();
    if (this.config.blockedExtensions.includes(ext)) {
      throw new Error(`Blocked file extension: ${ext}`);
    }

    const mimeLower = attachment.contentType.toLowerCase();
    if (this.config.blockedMimeTypes.includes(mimeLower)) {
      throw new Error(`Blocked MIME type: ${mimeLower}`);
    }

    if (this.config.allowedMimeTypes.length > 0) {
      if (!this.config.allowedMimeTypes.includes(mimeLower)) {
        throw new Error(`MIME type not allowed: ${mimeLower}`);
      }
    }

    if (attachment.size === 0) {
      warnings.push('Empty file');
    }

    if (!attachment.contentType || attachment.contentType === 'application/octet-stream') {
      warnings.push('Unknown MIME type');
    }

    const checksum = this.computeChecksum(attachment.content);

    return {
      ...attachment,
      checksum,
      safeFilename,
      warnings,
    };
  }

  private sanitizeFilename(filename: string): string {
    let safe = filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+/, '')
      .trim();

    if (safe.length === 0) safe = 'unnamed_attachment';
    if (safe.length > 255) safe = safe.substring(0, 255);

    return safe;
  }

  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot >= 0 ? filename.substring(lastDot) : '';
  }

  private computeChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
