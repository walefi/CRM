import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import * as crypto from 'crypto';

export interface ApiKeyResult {
  id: string;
  tenantId: string;
  name: string;
  scopes: string[];
}

@Injectable()
export class LeadInboundApiKeyService {
  private readonly logger = new Logger(LeadInboundApiKeyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async validateApiKey(key: string): Promise<ApiKeyResult> {
    if (!key || key.length < 10) {
      throw new UnauthorizedException('Invalid API key');
    }

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key },
      select: {
        id: true,
        key: true,
        secret: true,
        tenantId: true,
        name: true,
        scopes: true,
        isActive: true,
        expiresAt: true,
      },
    });

    if (!apiKey) {
      this.logger.warn(`Invalid API key attempt: key prefix=${key.substring(0, 8)}...`);
      throw new UnauthorizedException('Invalid API key');
    }

    if (!apiKey.isActive) {
      this.logger.warn(`Inactive API key used: id=${apiKey.id} tenant=${apiKey.tenantId}`);
      throw new UnauthorizedException('API key is inactive');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      this.logger.warn(`Expired API key used: id=${apiKey.id} tenant=${apiKey.tenantId}`);
      throw new UnauthorizedException('API key has expired');
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: apiKey.id,
      tenantId: apiKey.tenantId,
      name: apiKey.name,
      scopes: apiKey.scopes,
    };
  }

  async createApiKey(
    tenantId: string,
    name: string,
    scopes: string[] = ['leads:inbound'],
  ): Promise<{ id: string; key: string; name: string }> {
    const key = `crm_${crypto.randomBytes(32).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');

    const encryptedSecret = this.encryptionService.isAvailable()
      ? this.encryptionService.encrypt(secret)
      : secret;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name,
        key,
        secret: encryptedSecret,
        scopes,
        tenantId,
        isActive: true,
      },
    });

    this.logger.log(`API key created: id=${apiKey.id} tenant=${tenantId} name=${name}`);

    return {
      id: apiKey.id,
      key,
      name: apiKey.name,
    };
  }

  async revokeApiKey(tenantId: string, keyId: string): Promise<void> {
    await this.prisma.apiKey.updateMany({
      where: { id: keyId, tenantId },
      data: { isActive: false },
    });

    this.logger.log(`API key revoked: id=${keyId} tenant=${tenantId}`);
  }

  async listApiKeys(tenantId: string) {
    return this.prisma.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        key: true,
        scopes: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
