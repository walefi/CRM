import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private masterKey: Buffer | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const rawKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!rawKey) {
      this.logger.warn('ENCRYPTION_KEY not set — credential encryption disabled');
      return;
    }
    if (rawKey.length !== 32) {
      this.logger.warn('ENCRYPTION_KEY should be exactly 32 characters for AES-256');
    }
    this.masterKey = Buffer.from(rawKey, 'utf-8');
    this.logger.log('EncryptionService initialized with AES-256-GCM');
  }

  isAvailable(): boolean {
    return this.masterKey !== null;
  }

  encrypt(plaintext: string): string {
    if (!this.masterKey) {
      throw new Error('Encryption unavailable: ENCRYPTION_KEY not configured');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = this.deriveKey(salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString('base64');
  }

  decrypt(ciphertext: string): string {
    if (!this.masterKey) {
      throw new Error('Encryption unavailable: ENCRYPTION_KEY not configured');
    }

    const combined = Buffer.from(ciphertext, 'base64');

    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    const key = this.deriveKey(salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf-8');
  }

  encryptObject<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[],
  ): T {
    const result = { ...obj };
    for (const field of fields) {
      const value = result[field];
      if (typeof value === 'string' && value.length > 0) {
        try {
          (result as Record<string, unknown>)[field as string] = this.encrypt(value);
        } catch (error: any) {
          this.logger.warn(`Failed to encrypt field ${String(field)}: ${error.message}`);
        }
      }
    }
    return result;
  }

  decryptObject<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[],
  ): T {
    const result = { ...obj };
    for (const field of fields) {
      const value = result[field];
      if (typeof value === 'string' && value.length > 0) {
        try {
          (result as Record<string, unknown>)[field as string] = this.decrypt(value);
        } catch (error: any) {
          this.logger.warn(`Failed to decrypt field ${String(field)}: ${error.message}`);
        }
      }
    }
    return result;
  }

  private deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(this.masterKey!, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
  }
}
