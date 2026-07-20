import { Test, TestingModule } from '@nestjs/testing';
import { EmailReceiverService } from '../email-receiver.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventBusService } from '../../../infrastructure/event-bus/event-bus.service';
import { IncomingEmailPayload } from '../dto/incoming-email.dto';

describe('EmailReceiverService', () => {
  let service: EmailReceiverService;

  const mockPrisma = {
    message: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    conversation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const basePayload: IncomingEmailPayload = {
    provider: 'generic',
    providerMessageId: 'prov-001',
    messageId: '<msg-123@example.com>',
    from: { address: 'sender@example.com', name: 'John Sender' },
    to: [{ address: 'crm@company.com', name: 'CRM' }],
    subject: 'Test Subject',
    textBody: 'Hello, this is a test email.',
    htmlBody: '<p>Hello, this is a test email.</p>',
    receivedAt: new Date('2026-07-19T10:00:00Z'),
    tenantId: 'tenant-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailReceiverService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<EmailReceiverService>(EmailReceiverService);
    jest.clearAllMocks();
  });

  function setupTransactionMock() {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        message: {
          create: mockPrisma.message.create,
          findFirst: mockPrisma.message.findFirst,
        },
        conversation: {
          create: mockPrisma.conversation.create,
          findFirst: mockPrisma.conversation.findFirst,
          findUnique: mockPrisma.conversation.findUnique,
          update: mockPrisma.conversation.update,
        },
        contact: { findFirst: mockPrisma.contact.findFirst },
      };
      return fn(tx);
    });
  }

  describe('receiveEmail', () => {
    const mockContact = {
      id: 'contact-1',
      firstName: 'John',
      lastName: 'Sender',
      email: 'sender@example.com',
    };
    const mockConversation = {
      id: 'conv-1',
      channel: 'EMAIL',
      subject: 'Test Subject',
    };
    const mockMessage = {
      id: 'msg-1',
      content: '<p>Hello, this is a test email.</p>',
      direction: 'INBOUND',
      channel: 'EMAIL',
      status: 'received',
      conversationId: 'conv-1',
    };

    beforeEach(() => {
      mockPrisma.contact.findFirst.mockResolvedValue(mockContact);
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue(mockConversation);
      mockPrisma.conversation.update.mockResolvedValue({});
      mockPrisma.message.create.mockResolvedValue(mockMessage);
      mockPrisma.message.findFirst.mockResolvedValue(null);
      mockEventBus.publish.mockResolvedValue(undefined);
      setupTransactionMock();
    });

    it('should process a valid inbound email', async () => {
      const result = await service.receiveEmail('tenant-1', basePayload);

      expect(result.status).toBe('processed');
      expect(result.messageId).toBe('msg-1');
      expect(result.conversationId).toBe('conv-1');
    });

    it('should use existing contact when found', async () => {
      const result = await service.receiveEmail('tenant-1', basePayload);

      expect(result.contactId).toBe('contact-1');
      expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'sender@example.com',
          }),
        }),
      );
    });

    it('should create new conversation when no thread found', async () => {
      await service.receiveEmail('tenant-1', basePayload);

      expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channel: 'EMAIL',
            subject: 'Test Subject',
          }),
        }),
      );
    });

    it('should create inbound message with metadata', async () => {
      await service.receiveEmail('tenant-1', basePayload);

      expect(mockPrisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            direction: 'INBOUND',
            channel: 'EMAIL',
            status: 'received',
            externalId: 'prov-001',
          }),
        }),
      );
    });

    it('should publish MessageCreatedEvent and MessageReceivedEvent', async () => {
      await service.receiveEmail('tenant-1', basePayload);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
    });

    it('should update conversation lastMessageAt', async () => {
      await service.receiveEmail('tenant-1', basePayload);

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1' },
          data: expect.objectContaining({
            lastMessageAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should increment unreadCount', async () => {
      await service.receiveEmail('tenant-1', basePayload);

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unreadCount: { increment: 1 },
          }),
        }),
      );
    });
  });

  describe('idempotency', () => {
    beforeEach(() => {
      setupTransactionMock();
    });

    it('should reject duplicate emails by externalId', async () => {
      mockPrisma.message.findFirst.mockResolvedValue({
        id: 'existing-msg',
        conversationId: 'existing-conv',
      });

      const result = await service.receiveEmail('tenant-1', basePayload);

      expect(result.status).toBe('duplicate');
      expect(mockPrisma.message.create).not.toHaveBeenCalled();
    });

    it('should use providerMessageId as primary idempotency key', async () => {
      mockPrisma.message.findFirst.mockResolvedValue({
        id: 'existing-msg',
        conversationId: 'existing-conv',
      });

      const result = await service.receiveEmail('tenant-1', basePayload);

      expect(result.status).toBe('duplicate');
      expect(mockPrisma.message.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            externalId: 'prov-001',
          }),
        }),
      );
    });

    it('should fallback to messageId when providerMessageId missing', async () => {
      mockPrisma.message.findFirst.mockResolvedValue(null);
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-1' });
      mockPrisma.conversation.update.mockResolvedValue({});
      mockPrisma.message.create.mockResolvedValue({ id: 'msg-1' });

      const noProvId: IncomingEmailPayload = {
        ...basePayload,
        providerMessageId: undefined,
      };

      await service.receiveEmail('tenant-1', noProvId);

      expect(mockPrisma.message.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            externalId: '<msg-123@example.com>',
          }),
        }),
      );
    });
  });

  describe('threading', () => {
    const mockMessage = {
      id: 'msg-1',
      direction: 'INBOUND',
      channel: 'EMAIL',
      status: 'received',
      conversationId: 'thread-conv',
    };

    beforeEach(() => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue({ id: 'new-conv' });
      mockPrisma.conversation.update.mockResolvedValue({});
      mockPrisma.message.create.mockResolvedValue(mockMessage);
      mockPrisma.message.findFirst.mockResolvedValue(null);
      mockEventBus.publish.mockResolvedValue(undefined);
      setupTransactionMock();
    });

    it('should thread by In-Reply-To header', async () => {
      const replyEmail: IncomingEmailPayload = {
        ...basePayload,
        inReplyTo: '<original-msg@example.com>',
      };

      mockPrisma.message.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ conversationId: 'thread-conv' });
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'thread-conv' });

      const result = await service.receiveEmail('tenant-1', replyEmail);

      expect(result.conversationId).toBe('thread-conv');
    });

    it('should thread by References header', async () => {
      const refEmail: IncomingEmailPayload = {
        ...basePayload,
        references: ['<ref-msg@example.com>'],
      };

      mockPrisma.message.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ conversationId: 'ref-conv' });
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'ref-conv' });

      const result = await service.receiveEmail('tenant-1', refEmail);

      expect(result.conversationId).toBe('ref-conv');
    });

    it('should try multiple references in order', async () => {
      const refEmail: IncomingEmailPayload = {
        ...basePayload,
        references: ['<ref-old@example.com>', '<ref-recent@example.com>'],
      };

      mockPrisma.message.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ conversationId: 'old-conv' });
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'old-conv' });

      const result = await service.receiveEmail('tenant-1', refEmail);

      expect(result.conversationId).toBe('old-conv');
    });

    it('should thread by contact + normalized subject', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ id: 'c1' });
      mockPrisma.conversation.findFirst.mockResolvedValue({ id: 'subject-conv' });
      mockPrisma.message.findFirst.mockResolvedValue(null);

      const result = await service.receiveEmail('tenant-1', basePayload);

      expect(result.conversationId).toBe('subject-conv');
    });

    it('should create new conversation when no thread found', async () => {
      const result = await service.receiveEmail('tenant-1', basePayload);

      expect(result.conversationId).toBe('new-conv');
      expect(mockPrisma.conversation.create).toHaveBeenCalled();
    });
  });

  describe('contact matching', () => {
    beforeEach(() => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-1' });
      mockPrisma.conversation.update.mockResolvedValue({});
      mockPrisma.message.create.mockResolvedValue({ id: 'msg-1' });
      mockPrisma.message.findFirst.mockResolvedValue(null);
      mockEventBus.publish.mockResolvedValue(undefined);
      setupTransactionMock();
    });

    it('should normalize email addresses', async () => {
      const emailWithCaps: IncomingEmailPayload = {
        ...basePayload,
        from: { address: 'SENDER@EXAMPLE.COM', name: 'Test' },
      };

      await service.receiveEmail('tenant-1', emailWithCaps);

      expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'sender@example.com',
          }),
        }),
      );
    });

    it('should reject invalid sender email', async () => {
      const invalidEmail: IncomingEmailPayload = {
        ...basePayload,
        from: { address: 'not-an-email', name: 'Test' },
      };

      const result = await service.receiveEmail('tenant-1', invalidEmail);

      expect(result.status).toBe('error');
      expect(result.reason).toBe('invalid_sender');
    });

    it('should not auto-create contact when not found', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      const result = await service.receiveEmail('tenant-1', basePayload);

      expect(result.contactId).toBeNull();
    });
  });

  describe('fallback Message-ID', () => {
    beforeEach(() => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-1' });
      mockPrisma.conversation.update.mockResolvedValue({});
      mockPrisma.message.create.mockResolvedValue({ id: 'msg-1' });
      mockPrisma.message.findFirst.mockResolvedValue(null);
      mockEventBus.publish.mockResolvedValue(undefined);
      setupTransactionMock();
    });

    it('should generate fallback when both providerMessageId and messageId are missing', async () => {
      const noIdEmail: IncomingEmailPayload = {
        ...basePayload,
        providerMessageId: undefined,
        messageId: '',
      };

      const result = await service.receiveEmail('tenant-1', noIdEmail);

      expect(result.status).toBe('processed');
      expect(mockPrisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            externalId: expect.stringContaining('fallback-'),
          }),
        }),
      );
    });
  });

  describe('transaction safety', () => {
    it('should wrap entire flow in a Prisma transaction', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ id: 'c1' });
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-1' });
      mockPrisma.conversation.update.mockResolvedValue({});
      mockPrisma.message.create.mockResolvedValue({ id: 'msg-1' });
      mockPrisma.message.findFirst.mockResolvedValue(null);
      mockEventBus.publish.mockResolvedValue(undefined);
      setupTransactionMock();

      await service.receiveEmail('tenant-1', basePayload);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(typeof mockPrisma.$transaction.mock.calls[0][0]).toBe('function');
    });

    it('should return error when transaction throws', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('DB error'));

      const result = await service.receiveEmail('tenant-1', basePayload);

      expect(result.status).toBe('error');
    });
  });
});
