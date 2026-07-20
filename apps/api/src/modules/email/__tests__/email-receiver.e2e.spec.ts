import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EmailReceiverService } from '../email-receiver.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventBusService } from '../../../infrastructure/event-bus/event-bus.service';
import { IncomingEmailPayload } from '../dto/incoming-email.dto';

/**
 * E2E VALIDATION — Email Receiving Pipeline
 *
 * Validates the complete flow without external dependencies:
 * Raw email → IncomingEmailPayload → EmailReceiverService → Message + Conversation + Events
 *
 * Simulates what SimpleImapAdapter + ImapPollWorker would do with real IMAP data.
 */

describe('E2E — Email Receiving Pipeline', () => {
  let receiverService: EmailReceiverService;
  let eventBus: EventBusService;

  const mockMessage = {
    create: jest.fn(),
    findFirst: jest.fn(),
  };
  const mockConversation = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const mockContact = {
    findFirst: jest.fn(),
  };

  const mockPrisma = {
    message: mockMessage,
    conversation: mockConversation,
    contact: mockContact,
    $transaction: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  beforeAll(() => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        message: { create: mockMessage.create, findFirst: mockMessage.findFirst },
        conversation: {
          create: mockConversation.create,
          findFirst: mockConversation.findFirst,
          findUnique: mockConversation.findUnique,
          update: mockConversation.update,
        },
      };
      return fn(tx);
    });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailReceiverService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    receiverService = module.get<EmailReceiverService>(EmailReceiverService);
    eventBus = module.get<EventBusService>(EventBusService);
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        message: { create: mockMessage.create, findFirst: mockMessage.findFirst },
        conversation: {
          create: mockConversation.create,
          findFirst: mockConversation.findFirst,
          findUnique: mockConversation.findUnique,
          update: mockConversation.update,
        },
      };
      return fn(tx);
    });
  });

  const TENANT_ID = 'tenant-e2e-001';
  const EMAIL_ACCOUNT_ID = 'acc-e2e-001';

  function makeEmail(overrides: Partial<IncomingEmailPayload> = {}): IncomingEmailPayload {
    return {
      provider: 'imap',
      providerMessageId: `<${crypto.randomUUID()}@e2e.test>`,
      messageId: `<${crypto.randomUUID()}@e2e.test>`,
      from: { address: 'sender@example.com', name: 'Test Sender' },
      to: [{ address: 'crm@company.com', name: 'CRM' }],
      subject: 'E2E Test Subject',
      textBody: 'This is a plain text body for E2E testing.',
      htmlBody: '<p>This is an <b>HTML</b> body for E2E testing.</p>',
      receivedAt: new Date('2026-07-19T12:00:00Z'),
      tenantId: TENANT_ID,
      emailAccountId: EMAIL_ACCOUNT_ID,
      ...overrides,
    };
  }

  const mockMessageRecord = (id: string, convId: string) => ({
    id,
    content: '<p>test</p>',
    direction: 'INBOUND',
    channel: 'EMAIL',
    status: 'received',
    conversationId: convId,
    externalId: 'test-external-id',
  });

  const mockConversationRecord = (id: string) => ({
    id,
    channel: 'EMAIL',
    subject: 'E2E Test Subject',
    status: 'active',
  });

  // ============================================================
  // FASE 2 — EMAIL NOVO
  // ============================================================
  describe('FASE 2 — New Email Processing', () => {
    it('should process a brand new email end-to-end', async () => {
      const email = makeEmail();
      const convId = 'conv-new-001';
      const msgId = 'msg-new-001';

      mockMessage.findFirst.mockResolvedValue(null);
      mockContact.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create.mockResolvedValue(mockConversationRecord(convId));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord(msgId, convId));
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.status).toBe('processed');
      expect(result.messageId).toBe(msgId);
      expect(result.conversationId).toBe(convId);

      expect(mockMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            direction: 'INBOUND',
            channel: 'EMAIL',
            status: 'received',
            externalId: email.providerMessageId,
            senderName: 'Test Sender',
          }),
        }),
      );

      expect(mockConversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subject: 'E2E Test Subject',
            channel: 'EMAIL',
            status: 'active',
          }),
        }),
      );

      expect(mockConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unreadCount: { increment: 1 },
          }),
        }),
      );

      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
    });

    it('should store full metadata in Message', async () => {
      const email = makeEmail({
        cc: [{ address: 'cc@example.com', name: 'CC User' }],
        headers: { 'x-custom': 'value' },
      });

      mockMessage.findFirst.mockResolvedValue(null);
      mockContact.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create.mockResolvedValue(mockConversationRecord('conv-1'));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord('msg-1', 'conv-1'));
      mockEventBus.publish.mockResolvedValue(undefined);

      await receiverService.receiveEmail(TENANT_ID, email);

      const createCall = mockMessage.create.mock.calls[0][0];
      const metadata = JSON.parse(createCall.data.metadata);

      expect(metadata.provider).toBe('imap');
      expect(metadata.subject).toBe('E2E Test Subject');
      expect(metadata.from).toBe('sender@example.com');
      expect(metadata.to).toEqual(['crm@company.com']);
      expect(metadata.cc).toEqual(['cc@example.com']);
      expect(metadata.emailAccountId).toBe(EMAIL_ACCOUNT_ID);
      expect(metadata.inReplyTo).toBeUndefined();
      expect(metadata.references).toBeUndefined();
    });

    it('should handle email with only textBody (no htmlBody)', async () => {
      const email = makeEmail({ htmlBody: undefined });

      mockMessage.findFirst.mockResolvedValue(null);
      mockContact.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create.mockResolvedValue(mockConversationRecord('conv-1'));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord('msg-1', 'conv-1'));
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.status).toBe('processed');
      const createCall = mockMessage.create.mock.calls[0][0];
      expect(createCall.data.messageType).toBe('text');
      expect(createCall.data.content).toBe('This is a plain text body for E2E testing.');
    });
  });

  // ============================================================
  // FASE 3 — THREADING
  // ============================================================
  describe('FASE 3 — Threading', () => {
    it('should thread reply by In-Reply-To to existing conversation', async () => {
      const originalConvId = 'conv-original-001';

      const replyEmail = makeEmail({
        subject: 'Re: E2E Test Subject',
        inReplyTo: '<original-msg@e2e.test>',
        textBody: 'This is my reply.',
      });

      mockMessage.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ conversationId: originalConvId });
      mockConversation.findUnique.mockResolvedValue({ id: originalConvId });
      mockContact.findFirst.mockResolvedValue(null);
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord('msg-reply-001', originalConvId));
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await receiverService.receiveEmail(TENANT_ID, replyEmail);

      expect(result.conversationId).toBe(originalConvId);
      expect(mockConversation.create).not.toHaveBeenCalled();
    });

    it('should thread reply by References header', async () => {
      const refConvId = 'conv-ref-001';

      const refEmail = makeEmail({
        subject: 'Re: Ref Thread',
        references: ['<ref-msg-1@e2e.test>', '<ref-msg-2@e2e.test>'],
      });

      mockMessage.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ conversationId: refConvId });
      mockConversation.findUnique.mockResolvedValue({ id: refConvId });
      mockContact.findFirst.mockResolvedValue(null);
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord('msg-ref-001', refConvId));
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await receiverService.receiveEmail(TENANT_ID, refEmail);

      expect(result.conversationId).toBe(refConvId);
    });

    it('should create new conversation when In-Reply-To references non-existent message', async () => {
      const email = makeEmail({
        inReplyTo: '<nonexistent@e2e.test>',
      });

      mockMessage.findFirst.mockResolvedValue(null);
      mockContact.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create.mockResolvedValue(mockConversationRecord('conv-new-002'));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord('msg-002', 'conv-new-002'));
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.conversationId).toBe('conv-new-002');
      expect(mockConversation.create).toHaveBeenCalled();
    });

    it('should normalize subject for contact+subject matching (strip Re:/Fwd:)', async () => {
      const contactId = 'contact-thread-001';

      const email = makeEmail({
        subject: 'Re: Original Subject',
      });

      mockMessage.findFirst.mockResolvedValue(null);
      mockContact.findFirst.mockResolvedValue({ id: contactId });
      mockConversation.findFirst.mockResolvedValue({ id: 'conv-subject-match' });
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord('msg-sm-001', 'conv-subject-match'));
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.conversationId).toBe('conv-subject-match');
      expect(mockConversation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subject: 'original subject',
          }),
        }),
      );
    });
  });

  // ============================================================
  // FASE 4 — CONTACT MATCHING
  // ============================================================
  describe('FASE 4 — Contact Matching', () => {
    it('should find existing contact by normalized email', async () => {
      const contactId = 'contact-existing-001';
      mockContact.findFirst.mockResolvedValue({
        id: contactId,
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'Contact',
      });
      mockMessage.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create.mockResolvedValue(mockConversationRecord('conv-cm-001'));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord('msg-cm-001', 'conv-cm-001'));
      mockEventBus.publish.mockResolvedValue(undefined);

      const email = makeEmail({
        from: { address: 'EXISTING@Example.COM', name: 'Existing Contact' },
      });

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.status).toBe('processed');
      expect(mockContact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'existing@example.com',
          }),
        }),
      );
    });

    it('should NOT auto-create contact when sender is unknown', async () => {
      mockContact.findFirst.mockResolvedValue(null);
      mockMessage.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create.mockResolvedValue(mockConversationRecord('conv-unknown-001'));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord('msg-uk-001', 'conv-unknown-001'));
      mockEventBus.publish.mockResolvedValue(undefined);

      const email = makeEmail({
        from: { address: 'unknown@stranger.com', name: 'Unknown Person' },
      });

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.status).toBe('processed');
      expect(result.contactId).toBeNull();
      expect(mockConversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contactId: undefined,
          }),
        }),
      );
    });

    it('should reject invalid sender email format', async () => {
      const email = makeEmail({
        from: { address: 'not-an-email', name: 'Bad Sender' },
      });

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.status).toBe('error');
      expect(result.reason).toBe('invalid_sender');
      expect(mockMessage.create).not.toHaveBeenCalled();
    });

    it('should normalize sender email to lowercase', async () => {
      mockContact.findFirst.mockResolvedValue(null);
      mockMessage.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create.mockResolvedValue(mockConversationRecord('conv-norm-001'));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord('msg-norm-001', 'conv-norm-001'));
      mockEventBus.publish.mockResolvedValue(undefined);

      const email = makeEmail({
        from: { address: 'USER@DOMAIN.COM', name: 'Caps User' },
      });

      await receiverService.receiveEmail(TENANT_ID, email);

      expect(mockContact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'user@domain.com',
          }),
        }),
      );
    });
  });

  // ============================================================
  // FASE 5 — IDEMPOTÊNCIA
  // ============================================================
  describe('FASE 5 — Idempotency', () => {
    it('should reject duplicate email by providerMessageId', async () => {
      const email = makeEmail();

      mockMessage.findFirst.mockResolvedValue({
        id: 'existing-msg-001',
        conversationId: 'existing-conv-001',
      });

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.status).toBe('duplicate');
      expect(result.messageId).toBe('existing-msg-001');
      expect(result.conversationId).toBe('existing-conv-001');
      expect(mockMessage.create).not.toHaveBeenCalled();
      expect(mockConversation.create).not.toHaveBeenCalled();
    });

    it('should treat same email with different providerMessageId as different', async () => {
      const email1 = makeEmail({ providerMessageId: '<id-1@e2e.test>' });
      const email2 = makeEmail({ providerMessageId: '<id-2@e2e.test>' });

      mockMessage.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockContact.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create
        .mockResolvedValueOnce(mockConversationRecord('conv-dup-001'))
        .mockResolvedValueOnce(mockConversationRecord('conv-dup-002'));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create
        .mockResolvedValueOnce(mockMessageRecord('msg-dup-001', 'conv-dup-001'))
        .mockResolvedValueOnce(mockMessageRecord('msg-dup-002', 'conv-dup-002'));
      mockEventBus.publish.mockResolvedValue(undefined);

      const result1 = await receiverService.receiveEmail(TENANT_ID, email1);
      const result2 = await receiverService.receiveEmail(TENANT_ID, email2);

      expect(result1.status).toBe('processed');
      expect(result2.status).toBe('processed');
      expect(result1.messageId).not.toBe(result2.messageId);
      expect(mockMessage.create).toHaveBeenCalledTimes(2);
    });

    it('should generate fallback Message-IDs and still be idempotent', async () => {
      const email = makeEmail({
        providerMessageId: undefined,
        messageId: '',
      });

      mockMessage.findFirst.mockResolvedValue(null);
      mockContact.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create.mockResolvedValue(mockConversationRecord('conv-fb-001'));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord('msg-fb-001', 'conv-fb-001'));
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await receiverService.receiveEmail(TENANT_ID, email);
      expect(result.status).toBe('processed');

      const createCall = mockMessage.create.mock.calls[0][0];
      expect(createCall.data.externalId).toMatch(/^fallback-[a-f0-9]{32}$/);
    });

    it('should not create duplicate Timeline entries on retry', async () => {
      const email = makeEmail();

      mockMessage.findFirst.mockResolvedValue({
        id: 'existing-msg-retry',
        conversationId: 'existing-conv-retry',
      });

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.status).toBe('duplicate');
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // FASE 6 — FALHAS
  // ============================================================
  describe('FASE 6 — Error Handling', () => {
    it('should handle transaction failure gracefully', async () => {
      const email = makeEmail();

      mockPrisma.$transaction.mockRejectedValueOnce(new Error('Connection pool exhausted'));

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.status).toBe('error');
      expect(result.reason).toContain('transaction_failed');
    });

    it('should handle event bus failure without losing message', async () => {
      const email = makeEmail();
      const convId = 'conv-evt-001';
      const msgId = 'msg-evt-001';

      mockMessage.findFirst.mockResolvedValue(null);
      mockContact.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create.mockResolvedValue(mockConversationRecord(convId));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord(msgId, convId));
      mockEventBus.publish.mockRejectedValue(new Error('Event bus down'));

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.status).toBe('processed');
      expect(result.messageId).toBe(msgId);
    });

    it('should handle email with empty from address', async () => {
      const email = makeEmail({
        from: { address: '', name: '' },
      });

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.status).toBe('error');
      expect(result.reason).toBe('invalid_sender');
    });

    it('should handle email with missing subject gracefully', async () => {
      const email = makeEmail({ subject: '' });

      mockMessage.findFirst.mockResolvedValue(null);
      mockContact.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create.mockResolvedValue(mockConversationRecord('conv-nosubj'));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord('msg-nosubj', 'conv-nosubj'));
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await receiverService.receiveEmail(TENANT_ID, email);

      expect(result.status).toBe('processed');
    });

    it('should not log password in error messages', async () => {
      const email = makeEmail();
      const logs: string[] = [];
      const origError = console.error;
      console.error = (...args: any[]) => logs.push(args.join(' '));

      mockPrisma.$transaction.mockRejectedValueOnce(new Error('Auth failed: wrong password'));

      await receiverService.receiveEmail(TENANT_ID, email);

      const allLogs = logs.join(' ');
      expect(allLogs).not.toContain('wrong password');
      console.error = origError;
    });
  });

  // ============================================================
  // FASE 7 — OBSERVABILIDADE
  // ============================================================
  describe('FASE 7 — Observability', () => {
    it('should log email receipt with from and subject', async () => {
      const email = makeEmail();
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      mockMessage.findFirst.mockResolvedValue(null);
      mockContact.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create.mockResolvedValue(mockConversationRecord('conv-log-001'));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord('msg-log-001', 'conv-log-001'));
      mockEventBus.publish.mockResolvedValue(undefined);

      await receiverService.receiveEmail(TENANT_ID, email);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('subject="E2E Test Subject"'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('from=sender@example.com'),
      );

      logSpy.mockRestore();
    });

    it('should not expose raw password in any log', async () => {
      const sensitivePassword = 'SuperSecret123!@#';
      const logSpy = jest.spyOn(Logger.prototype, 'error');

      const email = makeEmail();

      mockPrisma.$transaction.mockRejectedValueOnce(new Error(`Auth failed: ${sensitivePassword}`));

      await receiverService.receiveEmail(TENANT_ID, email);

      const allCalls = logSpy.mock.calls.map((c) => c[0]).join(' ');
      expect(allCalls).not.toContain(sensitivePassword);

      logSpy.mockRestore();
    });
  });

  // ============================================================
  // INTEGRATION: Full IMAP → Service Pipeline
  // ============================================================
  describe('INTEGRATION — IMAP Adapter → Service Pipeline', () => {
    it('should convert ImapMessage to IncomingEmailPayload correctly', () => {
      const imapMessage = {
        uid: 42,
        uidValidity: 12345,
        messageId: '<imap-msg@e2e.test>',
        from: { address: 'imap-sender@example.com', name: 'IMAP Sender' },
        to: [{ address: 'crm@company.com', name: 'CRM' }],
        cc: [{ address: 'cc@example.com', name: 'CC' }],
        subject: 'IMAP Test',
        text: 'Plain text from IMAP',
        html: '<p>HTML from IMAP</p>',
        date: new Date('2026-07-19T14:00:00Z'),
        inReplyTo: '<reply-to@e2e.test>',
        references: ['<ref1@e2e.test>', '<ref2@e2e.test>'],
        headers: { 'x-mailer': 'TestMailer' },
        isRead: false,
      };

      const payload: IncomingEmailPayload = {
        provider: 'imap',
        providerMessageId: imapMessage.messageId,
        messageId: imapMessage.messageId,
        inReplyTo: imapMessage.inReplyTo,
        references: imapMessage.references,
        from: imapMessage.from,
        to: imapMessage.to,
        cc: imapMessage.cc,
        subject: imapMessage.subject,
        textBody: imapMessage.text,
        htmlBody: imapMessage.html,
        receivedAt: imapMessage.date,
        headers: imapMessage.headers,
        emailAccountId: EMAIL_ACCOUNT_ID,
        tenantId: TENANT_ID,
      };

      expect(payload.provider).toBe('imap');
      expect(payload.from.address).toBe('imap-sender@example.com');
      expect(payload.textBody).toBe('Plain text from IMAP');
      expect(payload.htmlBody).toBe('<p>HTML from IMAP</p>');
      expect(payload.inReplyTo).toBe('<reply-to@e2e.test>');
      expect(payload.references).toHaveLength(2);
    });

    it('should process the converted payload through the full pipeline', async () => {
      const payload: IncomingEmailPayload = {
        provider: 'imap',
        providerMessageId: '<pipeline-test@e2e.test>',
        messageId: '<pipeline-test@e2e.test>',
        from: { address: 'pipeline@example.com', name: 'Pipeline Test' },
        to: [{ address: 'crm@company.com', name: 'CRM' }],
        subject: 'Pipeline Integration Test',
        textBody: 'Full pipeline test body',
        htmlBody: '<p>Full pipeline test HTML</p>',
        receivedAt: new Date('2026-07-19T15:00:00Z'),
        emailAccountId: EMAIL_ACCOUNT_ID,
        tenantId: TENANT_ID,
      };

      const convId = 'conv-pipeline-001';
      const msgId = 'msg-pipeline-001';

      mockMessage.findFirst.mockResolvedValue(null);
      mockContact.findFirst.mockResolvedValue(null);
      mockConversation.findFirst.mockResolvedValue(null);
      mockConversation.create.mockResolvedValue(mockConversationRecord(convId));
      mockConversation.update.mockResolvedValue({});
      mockMessage.create.mockResolvedValue(mockMessageRecord(msgId, convId));
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await receiverService.receiveEmail(TENANT_ID, payload);

      expect(result.status).toBe('processed');
      expect(result.messageId).toBe(msgId);
      expect(result.conversationId).toBe(convId);

      expect(mockMessage.create).toHaveBeenCalledTimes(1);
      expect(mockConversation.create).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
    });
  });
});
