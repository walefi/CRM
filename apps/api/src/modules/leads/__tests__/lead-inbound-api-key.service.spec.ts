import { Test, TestingModule } from '@nestjs/testing';
import { LeadInboundApiKeyService } from '../lead-inbound-api-key.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EncryptionService } from '../../../infrastructure/encryption/encryption.service';
import { UnauthorizedException } from '@nestjs/common';

describe('LeadInboundApiKeyService', () => {
  let service: LeadInboundApiKeyService;

  const mockPrisma = {
    apiKey: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEncryption = {
    isAvailable: jest.fn().mockReturnValue(true),
    encrypt: jest.fn((v: string) => `encrypted_${v}`),
    decrypt: jest.fn((v: string) => v.replace('encrypted_', '')),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadInboundApiKeyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get(LeadInboundApiKeyService);
  });

  describe('validateApiKey', () => {
    it('should validate a valid API key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        key: 'crm_abc123def456',
        secret: 'encrypted_secret',
        tenantId: 'tenant-1',
        name: 'Form Key',
        scopes: ['leads:inbound'],
        isActive: true,
        expiresAt: null,
      });
      mockPrisma.apiKey.update.mockResolvedValue({});

      const result = await service.validateApiKey('crm_abc123def456');

      expect(result).toEqual({
        id: 'key-1',
        tenantId: 'tenant-1',
        name: 'Form Key',
        scopes: ['leads:inbound'],
      });
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should reject empty key', async () => {
      await expect(service.validateApiKey('')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject short key', async () => {
      await expect(service.validateApiKey('short')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject non-existent key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      await expect(service.validateApiKey('crm_nonexistentkey123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject inactive key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        key: 'crm_abc123',
        tenantId: 'tenant-1',
        name: 'Key',
        scopes: [],
        isActive: false,
        expiresAt: null,
      });

      await expect(service.validateApiKey('crm_abc123')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject expired key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        key: 'crm_abc123',
        tenantId: 'tenant-1',
        name: 'Key',
        scopes: [],
        isActive: true,
        expiresAt: new Date('2020-01-01'),
      });

      await expect(service.validateApiKey('crm_abc123')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('createApiKey', () => {
    it('should create a new API key', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-new',
        name: 'Test Key',
      });

      const result = await service.createApiKey('tenant-1', 'Test Key');

      expect(result.key).toMatch(/^crm_/);
      expect(result.name).toBe('Test Key');
      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Key',
            tenantId: 'tenant-1',
            scopes: ['leads:inbound'],
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key', async () => {
      mockPrisma.apiKey.updateMany.mockResolvedValue({ count: 1 });

      await service.revokeApiKey('tenant-1', 'key-1');

      expect(mockPrisma.apiKey.updateMany).toHaveBeenCalledWith({
        where: { id: 'key-1', tenantId: 'tenant-1' },
        data: { isActive: false },
      });
    });
  });

  describe('listApiKeys', () => {
    it('should list API keys for a tenant', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        { id: 'key-1', name: 'Key 1', key: 'crm_abc', scopes: [], isActive: true, expiresAt: null, lastUsedAt: null, createdAt: new Date() },
      ]);

      const result = await service.listApiKeys('tenant-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
        }),
      );
    });
  });
});
