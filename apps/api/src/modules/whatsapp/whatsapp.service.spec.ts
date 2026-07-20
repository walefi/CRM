import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let prismaMock: any;
  let eventBusMock: any;
  let queueServiceMock: any;

  beforeEach(async () => {
    prismaMock = {
      channel: { findFirst: jest.fn(), upsert: jest.fn() },
      message: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      contact: { findFirst: jest.fn(), create: jest.fn() },
      lead: { update: jest.fn() },
      conversation: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      whatsAppDelivery: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    eventBusMock = { publish: jest.fn().mockResolvedValue(undefined) };
    queueServiceMock = { addJob: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EventBusService, useValue: eventBusMock },
        { provide: QueueService, useValue: queueServiceMock },
        {
          provide: EncryptionService,
          useValue: {
            isAvailable: () => false,
            decrypt: (v: string) => v,
            encrypt: (v: string) => v,
            encryptObject: (o: any, _k: any) => o,
          },
        },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyWebhookSignature', () => {
    it('should return false if no signature provided', () => {
      const result = service.verifyWebhookSignature('body', undefined, 'secret');
      expect(result).toBe(false);
    });

    it('should return false for invalid signature', () => {
      const result = service.verifyWebhookSignature('body', 'sha256=invalid', 'secret');
      expect(result).toBe(false);
    });

    it('should return true for valid signature', () => {
      const expectedHash = createHmac('sha256', 'my-secret').update('body', 'utf8').digest('hex');
      const result = service.verifyWebhookSignature('body', `sha256=${expectedHash}`, 'my-secret');
      expect(result).toBe(true);
    });
  });

  describe('sendMediaMessage', () => {
    it('should queue media message', async () => {
      prismaMock.channel.findFirst.mockResolvedValue({
        id: 'ch-1',
        isConnected: true,
        credentials: { phoneNumberId: 'pn-1' },
      });
      prismaMock.conversation.findFirst.mockResolvedValue(null);
      prismaMock.conversation.create.mockResolvedValue({ id: 'conv-1' });
      prismaMock.message.create.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-1' });

      const result = await service.sendMediaMessage('tenant-1', 'user-1', {
        to: '5511999999999',
        mediaUrl: 'https://example.com/image.jpg',
        mediaType: 'image',
        caption: 'Test image',
      });

      expect(result.messageId).toBe('msg-1');
      expect(result.status).toBe('queued');
      expect(queueServiceMock.addJob).toHaveBeenCalledWith(
        'whatsapp-send',
        'send-whatsapp-media',
        expect.objectContaining({ mediaUrl: 'https://example.com/image.jpg', mediaType: 'image' }),
        expect.any(Object),
      );
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should create new delivery record', async () => {
      prismaMock.whatsAppDelivery.findUnique.mockResolvedValue(null);
      prismaMock.whatsAppDelivery.create.mockResolvedValue({});

      await service.updateDeliveryStatus('tenant-1', 'msg-1', 'delivered');

      expect(prismaMock.whatsAppDelivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          messageId: 'msg-1',
          status: 'delivered',
          tenantId: 'tenant-1',
        }),
      });
    });

    it('should update existing delivery record', async () => {
      prismaMock.whatsAppDelivery.findUnique.mockResolvedValue({ id: 'del-1' });
      prismaMock.whatsAppDelivery.update.mockResolvedValue({});

      await service.updateDeliveryStatus('tenant-1', 'msg-1', 'read');

      expect(prismaMock.whatsAppDelivery.update).toHaveBeenCalled();
    });
  });

  describe('getDeliveries', () => {
    it('should return paginated deliveries', async () => {
      prismaMock.whatsAppDelivery.findMany.mockResolvedValue([
        { id: 'del-1', status: 'delivered' },
      ]);
      prismaMock.whatsAppDelivery.count.mockResolvedValue(1);

      const result = await service.getDeliveries('tenant-1', { page: 1, limit: 10 });

      expect(result.deliveries).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
