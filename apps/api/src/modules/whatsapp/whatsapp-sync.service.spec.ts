import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppSyncService } from './whatsapp-sync.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';

describe('WhatsAppSyncService', () => {
  let service: WhatsAppSyncService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      message: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      whatsAppTemplate: {
        count: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
      channel: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppSyncService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: EncryptionService,
          useValue: { isAvailable: () => false, decrypt: (v: string) => v },
        },
      ],
    }).compile();

    service = module.get<WhatsAppSyncService>(WhatsAppSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSyncStatus', () => {
    it('should return sync status', async () => {
      prismaMock.message.count.mockResolvedValue(42);
      prismaMock.message.findFirst.mockResolvedValue({ createdAt: new Date('2026-01-15') });
      prismaMock.whatsAppTemplate.count.mockResolvedValue(5);
      prismaMock.whatsAppTemplate.findFirst.mockResolvedValue({
        updatedAt: new Date('2026-01-14'),
      });

      const result = await service.getSyncStatus('tenant-1');

      expect(result.totalMessages).toBe(42);
      expect(result.totalTemplates).toBe(5);
      expect(result.lastMessageAt).toEqual(new Date('2026-01-15'));
      expect(result.lastTemplateSyncAt).toEqual(new Date('2026-01-14'));
    });

    it('should handle null values', async () => {
      prismaMock.message.count.mockResolvedValue(0);
      prismaMock.message.findFirst.mockResolvedValue(null);
      prismaMock.whatsAppTemplate.count.mockResolvedValue(0);
      prismaMock.whatsAppTemplate.findFirst.mockResolvedValue(null);

      const result = await service.getSyncStatus('tenant-1');

      expect(result.totalMessages).toBe(0);
      expect(result.lastMessageAt).toBeNull();
      expect(result.totalTemplates).toBe(0);
      expect(result.lastTemplateSyncAt).toBeNull();
    });
  });

  describe('syncConversationHistory', () => {
    it('should return error if credentials not configured', async () => {
      prismaMock.channel.findFirst.mockResolvedValue(null);

      const result = await service.syncConversationHistory('tenant-1', 'pn-1', '5511999999999');

      expect(result.errors).toContain('Access token not configured');
      expect(result.messages).toBe(0);
    });

    it('should sync messages from Meta API', async () => {
      prismaMock.channel.findFirst.mockResolvedValue({
        credentials: { accessToken: 'token-123' },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'meta-1',
              from: '5511999999999',
              type: 'text',
              text: { body: 'Hello' },
              timestamp: '1700000000',
            },
            { id: 'meta-2', from: '5511888888888', type: 'image', timestamp: '1700000001' },
          ],
        }),
      });

      prismaMock.message.findFirst.mockResolvedValue(null);
      prismaMock.message.create.mockResolvedValue({});

      const result = await service.syncConversationHistory('tenant-1', 'pn-1', '5511999999999');

      expect(result.messages).toBe(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('syncTemplates', () => {
    it('should return error if credentials not configured', async () => {
      prismaMock.channel.findFirst.mockResolvedValue(null);

      const result = await service.syncTemplates('tenant-1');

      expect(result.errors).toContain('Credentials not configured');
    });

    it('should sync templates from Meta API', async () => {
      prismaMock.channel.findFirst.mockResolvedValue({
        credentials: { accessToken: 'token', wabaId: 'waba-1' },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'meta-tpl-1',
              name: 'welcome',
              language: 'pt_BR',
              category: 'UTILITY',
              status: 'APPROVED',
            },
          ],
        }),
      });

      prismaMock.whatsAppTemplate.upsert.mockResolvedValue({});

      const result = await service.syncTemplates('tenant-1');

      expect(result.synced).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });
});
