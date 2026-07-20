import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ImapPollWorker, ImapErrorType } from '../workers/imap-poll.worker';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EncryptionService } from '../../../infrastructure/encryption/encryption.service';
import { EmailReceiverService } from '../email-receiver.service';

const mockFetchUnseen = jest.fn().mockResolvedValue([]);
const mockMarkAsRead = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock('../adapters/simple-imap.adapter', () => {
  return {
    SimpleImapAdapter: jest.fn().mockImplementation(() => ({
      connect: mockConnect,
      disconnect: mockDisconnect,
      fetchUnseen: mockFetchUnseen,
      markAsRead: mockMarkAsRead,
      uidValidity: 12345,
    })),
  };
});

function makeMsg(uid: number, extra: Record<string, any> = {}) {
  return {
    uid,
    messageId: `<msg-${uid}@example.com>`,
    from: { address: `sender${uid}@example.com` },
    to: [{ address: 'crm@company.com' }],
    subject: `Subject ${uid}`,
    date: new Date(),
    text: `Body ${uid}`,
    html: `<p>Body ${uid}</p>`,
    attachments: [],
    ...extra,
  };
}

describe('ImapPollWorker', () => {
  let worker: ImapPollWorker;

  const mockPrisma = {
    emailAccount: {
      findFirst: jest.fn(),
    },
  };

  const mockEncryption = {
    isAvailable: jest.fn().mockReturnValue(true),
    decrypt: jest.fn((v: string) => `decrypted_${v}`),
  };

  const mockReceiver = {
    receiveEmail: jest.fn(),
  };

  const mockQueue = {
    registerWorker: jest.fn(),
    addJob: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultVal?: any) => {
      const config: Record<string, any> = {
        IMAP_POLL_INTERVAL_MS: 300000,
        IMAP_CONN_TIMEOUT_MS: 10000,
        IMAP_AUTH_TIMEOUT_MS: 5000,
        IMAP_MAX_MESSAGES_PER_POLL: 100,
        IMAP_MAX_BYTES_PER_POLL: 50 * 1024 * 1024,
      };
      return config[key] ?? defaultVal;
    }),
  };

  const mockAccount = {
    id: 'acc-1',
    email: 'user@example.com',
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    username: 'user@example.com',
    password: 'encrypted_pass',
    isActive: true,
    metadata: JSON.stringify({
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
      imapUsername: 'user@example.com',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImapPollWorker,
        { provide: QueueService, useValue: mockQueue },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: EmailReceiverService, useValue: mockReceiver },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    worker = module.get<ImapPollWorker>(ImapPollWorker);
    jest.clearAllMocks();
    mockFetchUnseen.mockResolvedValue([]);
    mockMarkAsRead.mockResolvedValue(undefined);
    mockConnect.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);
    mockReceiver.receiveEmail.mockResolvedValue({ status: 'processed', messageId: 'msg-1' });
  });

  describe('processPoll', () => {
    it('should return 0 results when account not found', async () => {
      mockPrisma.emailAccount.findFirst.mockResolvedValue(null);

      const result = await worker.processPoll({
        tenantId: 'tenant-1',
        emailAccountId: 'acc-1',
      });

      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.duplicates).toBe(0);
      expect(result.skippedBacklog).toBe(0);
      expect(result.bytesReceived).toBe(0);
    });

    it('should return 0 results when no IMAP config', async () => {
      mockPrisma.emailAccount.findFirst.mockResolvedValue({
        ...mockAccount,
        metadata: '{}',
      });

      const result = await worker.processPoll({
        tenantId: 'tenant-1',
        emailAccountId: 'acc-1',
      });

      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.duplicates).toBe(0);
    });

    it('should decrypt password before connecting', async () => {
      mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);

      await worker.processPoll({
        tenantId: 'tenant-1',
        emailAccountId: 'acc-1',
      });

      expect(mockEncryption.decrypt).toHaveBeenCalledWith('encrypted_pass');
    });

    it('should process messages and return counts', async () => {
      mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
      mockReceiver.receiveEmail.mockResolvedValue({ status: 'processed', messageId: 'msg-1' });
      mockFetchUnseen.mockResolvedValue([makeMsg(1), makeMsg(2)]);

      const result = await worker.processPoll({
        tenantId: 'tenant-1',
        emailAccountId: 'acc-1',
      });

      expect(result.processed).toBe(2);
      expect(result.errors).toBe(0);
      expect(result.bytesReceived).toBeGreaterThan(0);
      expect(result.bytesStored).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(mockMarkAsRead).toHaveBeenCalledTimes(2);
    });

    it('should handle per-message errors without stopping batch', async () => {
      mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
      mockReceiver.receiveEmail
        .mockResolvedValueOnce({ status: 'processed', messageId: 'msg-1' })
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ status: 'processed', messageId: 'msg-3' });
      mockFetchUnseen.mockResolvedValue([makeMsg(1), makeMsg(2), makeMsg(3)]);

      const result = await worker.processPoll({
        tenantId: 'tenant-1',
        emailAccountId: 'acc-1',
      });

      expect(result.processed).toBe(2);
      expect(result.errors).toBe(1);
    });

    it('should mark duplicates as read', async () => {
      mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
      mockReceiver.receiveEmail.mockResolvedValue({ status: 'duplicate', messageId: 'existing-msg' });
      mockFetchUnseen.mockResolvedValue([makeMsg(1)]);

      const result = await worker.processPoll({
        tenantId: 'tenant-1',
        emailAccountId: 'acc-1',
      });

      expect(result.duplicates).toBe(1);
      expect(result.processed).toBe(0);
      expect(mockMarkAsRead).toHaveBeenCalledWith(1);
    });

    it('should always disconnect in finally block', async () => {
      mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
      mockConnect.mockRejectedValue(new Error('Connect failed'));

      try {
        await worker.processPoll({
          tenantId: 'tenant-1',
          emailAccountId: 'acc-1',
        });
      } catch {
        // expected - connect throws transient error
      }

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should not log password in error messages', async () => {
      mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: any[]) => logs.push(args.join(' '));

      mockConnect.mockRejectedValue(new Error('Auth failed'));

      try {
        await worker.processPoll({
          tenantId: 'tenant-1',
          emailAccountId: 'acc-1',
        });
      } catch {
        // expected
      }

      const allLogs = logs.join(' ');
      expect(allLogs).not.toContain('encrypted_pass');
      expect(allLogs).not.toContain('decrypted_');

      console.log = origLog;
    });

    describe('FASE 2+3 — mailbox volume and byte limits', () => {
      it('should respect IMAP_MAX_MESSAGES_PER_POLL', async () => {
        mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
        mockFetchUnseen.mockResolvedValue(
          Array.from({ length: 150 }, (_, i) => makeMsg(i + 1)),
        );

        const result = await worker.processPoll({
          tenantId: 'tenant-1',
          emailAccountId: 'acc-1',
        });

        expect(result.processed).toBeLessThanOrEqual(100);
        expect(result.skippedBacklog).toBeGreaterThan(0);
      });

      it('should stop processing when byte limit is reached', async () => {
        const largeConfig = {
          get: jest.fn((key: string, defaultVal?: any) => {
            const config: Record<string, any> = {
              IMAP_POLL_INTERVAL_MS: 300000,
              IMAP_CONN_TIMEOUT_MS: 10000,
              IMAP_AUTH_TIMEOUT_MS: 5000,
              IMAP_MAX_MESSAGES_PER_POLL: 100,
              IMAP_MAX_BYTES_PER_POLL: 5000,
            };
            return config[key] ?? defaultVal;
          }),
        };

        const largeWorker = new ImapPollWorker(
          mockQueue as any,
          mockPrisma as any,
          mockEncryption as any,
          mockReceiver as any,
          largeConfig as any,
        );

        mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
        const bigBody = 'x'.repeat(3000);
        mockFetchUnseen.mockResolvedValue([
          makeMsg(1, { text: bigBody, html: `<p>${bigBody}</p>` }),
          makeMsg(2, { text: bigBody, html: `<p>${bigBody}</p>` }),
          makeMsg(3, { text: bigBody, html: `<p>${bigBody}</p>` }),
        ]);

        const result = await largeWorker.processPoll({
          tenantId: 'tenant-1',
          emailAccountId: 'acc-1',
        });

        expect(result.processed).toBeLessThan(3);
        expect(result.skippedBacklog).toBeGreaterThan(0);
      });

      it('should not break mid-message when byte limit reached', async () => {
        const largeConfig = {
          get: jest.fn((key: string, defaultVal?: any) => {
            const config: Record<string, any> = {
              IMAP_POLL_INTERVAL_MS: 300000,
              IMAP_CONN_TIMEOUT_MS: 10000,
              IMAP_AUTH_TIMEOUT_MS: 5000,
              IMAP_MAX_MESSAGES_PER_POLL: 100,
              IMAP_MAX_BYTES_PER_POLL: 500,
            };
            return config[key] ?? defaultVal;
          }),
        };

        const limitedWorker = new ImapPollWorker(
          mockQueue as any,
          mockPrisma as any,
          mockEncryption as any,
          mockReceiver as any,
          largeConfig as any,
        );

        mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
        mockFetchUnseen.mockResolvedValue([makeMsg(1), makeMsg(2)]);

        const result = await limitedWorker.processPoll({
          tenantId: 'tenant-1',
          emailAccountId: 'acc-1',
        });

        expect(result.processed).toBeGreaterThanOrEqual(1);
        expect(mockMarkAsRead).toHaveBeenCalled();
      });
    });

    describe('FASE 5 — error classification', () => {
      it('should classify authentication failures as permanent', () => {
        const permanentErrors = [
          'Authentication failed',
          'Invalid credentials',
          'Login failed',
          'Mailbox does not exist',
          'Permission denied',
          'Account disabled',
        ];

        for (const msg of permanentErrors) {
          const type = worker.classifyError(new Error(msg));
          expect(type).toBe(ImapErrorType.PERMANENT);
        }
      });

      it('should classify connection errors as transient', () => {
        const transientErrors = [
          'Connection refused',
          'Timeout',
          'ECONNRESET',
          'ETIMEDOUT',
          'Socket hang up',
          'Temporary failure',
          'Service unavailable',
        ];

        for (const msg of transientErrors) {
          const type = worker.classifyError(new Error(msg));
          expect(type).toBe(ImapErrorType.TRANSIENT);
        }
      });

      it('should not retry permanent connection errors via BullMQ', async () => {
        mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
        mockConnect.mockRejectedValue(new Error('Authentication failed'));

        const result = await worker.processPoll({
          tenantId: 'tenant-1',
          emailAccountId: 'acc-1',
        });

        expect(result.errors).toBe(0);
        expect(result.processed).toBe(0);
        expect(mockDisconnect).toHaveBeenCalled();
      });

      it('should throw transient errors for BullMQ retry', async () => {
        mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
        mockConnect.mockRejectedValue(new Error('Connection refused'));

        await expect(
          worker.processPoll({ tenantId: 'tenant-1', emailAccountId: 'acc-1' }),
        ).rejects.toThrow();
      });

      it('should track consecutive errors', async () => {
        mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
        mockConnect.mockRejectedValue(new Error('Connection refused'));

        await worker.processPoll({ tenantId: 'tenant-1', emailAccountId: 'acc-1' }).catch(() => {});
        await worker.processPoll({ tenantId: 'tenant-1', emailAccountId: 'acc-1' }).catch(() => {});

        const state = worker.getState();
        expect(state.consecutiveErrors).toBe(2);
        expect(state.lastErrorAt).toBeInstanceOf(Date);
      });
    });

    describe('FASE 8 — observability metrics', () => {
      it('should return durationMs in metrics', async () => {
        mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
        mockFetchUnseen.mockResolvedValue([]);

        const result = await worker.processPoll({
          tenantId: 'tenant-1',
          emailAccountId: 'acc-1',
        });

        expect(result.durationMs).toBeGreaterThanOrEqual(0);
      });

      it('should track bytesReceived from message content', async () => {
        mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
        mockFetchUnseen.mockResolvedValue([
          makeMsg(1, { text: 'Hello World', subject: 'Test' }),
        ]);

        const result = await worker.processPoll({
          tenantId: 'tenant-1',
          emailAccountId: 'acc-1',
        });

        expect(result.bytesReceived).toBeGreaterThan(0);
      });

      it('should report attachment count in metrics', async () => {
        mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
        mockReceiver.receiveEmail.mockResolvedValue({
          status: 'processed',
          messageId: 'msg-1',
          attachmentResults: [
            { filename: 'a.pdf', status: 'stored' },
            { filename: 'b.pdf', status: 'stored' },
          ],
        });
        mockFetchUnseen.mockResolvedValue([makeMsg(1)]);

        const result = await worker.processPoll({
          tenantId: 'tenant-1',
          emailAccountId: 'acc-1',
        });

        expect(result.attachmentsProcessed).toBe(2);
      });

      it('should track worker state across polls', async () => {
        mockPrisma.emailAccount.findFirst.mockResolvedValue(mockAccount);
        mockFetchUnseen.mockResolvedValue([makeMsg(1), makeMsg(2)]);

        await worker.processPoll({ tenantId: 'tenant-1', emailAccountId: 'acc-1' });

        const state = worker.getState();
        expect(state.lastPollAt).toBeInstanceOf(Date);
        expect(state.totalProcessed).toBe(2);
        expect(state.totalErrors).toBe(0);
      });
    });

    describe('onModuleInit', () => {
      it('should register worker on init', () => {
        worker.onModuleInit();
        expect(mockQueue.registerWorker).toHaveBeenCalledWith(
          'email-imap-poll',
          expect.any(Function),
          { concurrency: 2 },
        );
      });
    });
  });
});
