import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { StorageAdapter, StoragePutResult } from './storage.adapter';

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly baseDir: string;

  constructor(private readonly configService: ConfigService) {
    this.baseDir = this.configService.get<string>(
      'LOCAL_STORAGE_DIR',
      path.join(process.cwd(), 'uploads', 'email-attachments'),
    );
    this.ensureDirectoryExists(this.baseDir);
  }

  async put(key: string, data: Buffer, options?: { mimeType?: string }): Promise<StoragePutResult> {
    const fullPath = this.getFullPath(key);
    this.ensureDirectoryExists(path.dirname(fullPath));

    await fs.promises.writeFile(fullPath, data);

    this.logger.debug(`Stored file: key=${key} size=${data.length}`);

    return {
      key,
      provider: 'local',
      size: data.length,
    };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const fullPath = this.getFullPath(key);
      return await fs.promises.readFile(fullPath);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullPath = this.getFullPath(key);
      await fs.promises.unlink(fullPath);
    } catch {
      // ignore
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(key);
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return `/api/v1/email/attachments/${encodeURIComponent(key)}`;
  }

  private getFullPath(key: string): string {
    const sanitized = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.baseDir, sanitized);
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
