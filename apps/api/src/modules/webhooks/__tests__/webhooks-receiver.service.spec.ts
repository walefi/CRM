import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksReceiverService } from '../webhooks-receiver.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventBusService } from '../../../infrastructure/event-bus/event-bus.service';
import { EncryptionService } from '../../../infrastructure/encryption/encryption.service';

describe('WebhooksReceiverService', () => {
  let service: WebhooksReceiverService;

  const mockPrisma = {
    channel: {
      findFirst: jest.fn(),
    },
    webhookDelivery: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockEncryption = {
    isAvailable: jest.fn().mockReturnValue(true),
    decrypt: jest.fn((v: string) => `decrypted_${v}`),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksReceiverService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: EncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get<WebhooksReceiverService>(WebhooksReceiverService);
    jest.clearAllMocks();
  });

  describe('receiveWebhook', () => {
    it('should reject when channel not found', async () => {
      mockPrisma.channel.findFirst.mockResolvedValue(null);

      const result = await service.receiveWebhook({
        provider: 'whatsapp',
        event: 'message',
        data: {},
        headers: {},
        rawBody: '{}',
        tenantId: 'tenant-1',
      });

      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('channel_not_found');
    });

    it('should reject when channel is inactive', async () => {
      mockPrisma.channel.findFirst.mockResolvedValue({ isActive: false });

      const result = await service.receiveWebhook({
        provider: 'whatsapp',
        event: 'message',
        data: {},
        headers: {},
        rawBody: '{}',
        tenantId: 'tenant-1',
      });

      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('channel_inactive');
    });

    it('should accept and log webhook when channel is active', async () => {
      mockPrisma.channel.findFirst.mockResolvedValue({
        id: 'ch-1',
        isActive: true,
        webhookSecret: null,
      });
      mockPrisma.webhookDelivery.findFirst.mockResolvedValue(null);
      mockPrisma.webhookDelivery.create.mockResolvedValue({});

      const result = await service.receiveWebhook({
        provider: 'whatsapp',
        event: 'message',
        data: { id: 'ext-123' },
        headers: {},
        rawBody: JSON.stringify({ event: 'message', id: 'ext-123' }),
        tenantId: 'tenant-1',
      });

      expect(result.accepted).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.create).toHaveBeenCalled();
    });

    it('should reject duplicate webhooks (idempotency)', async () => {
      mockPrisma.channel.findFirst.mockResolvedValue({
        id: 'ch-1',
        isActive: true,
        webhookSecret: null,
      });
      mockPrisma.webhookDelivery.findFirst.mockResolvedValue({
        id: 'existing-delivery',
        status: 'received',
      });

      const result = await service.receiveWebhook({
        provider: 'whatsapp',
        event: 'message',
        data: { id: 'ext-123' },
        headers: {},
        rawBody: JSON.stringify({ event: 'message', id: 'ext-123' }),
        tenantId: 'tenant-1',
      });

      expect(result.accepted).toBe(true);
      expect(result.reason).toBe('duplicate');
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('verifySignature', () => {
    it('should verify WhatsApp signatures', () => {
      const crypto = require('crypto');
      const secret = 'test-secret';
      const body = '{"event":"message"}';
      const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
      const signature = `sha256=${hmac}`;

      const result = service.verifySignature(
        body,
        { 'x-hub-signature-256': signature },
        secret,
        'whatsapp',
      );

      expect(result).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const result = service.verifySignature(
        '{"event":"message"}',
        { 'x-hub-signature-256': 'sha256=invalid' },
        'test-secret',
        'whatsapp',
      );

      expect(result).toBe(false);
    });
  });

  describe('registerNormalizer', () => {
    it('should register a custom normalizer', () => {
      const normalizer = {
        normalize: (data: Record<string, unknown>) => ({
          event: 'custom.event',
          data,
        }),
      };

      service.registerNormalizer('custom-provider', normalizer);

      expect(service['normalizers'].has('custom-provider')).toBe(true);
    });
  });
});
