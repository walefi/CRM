let mockOnceImpl: ((event: string, cb: any) => void) | null = null;
let mockConnectImpl: (() => void) | null = null;

jest.mock('imap', () => {
  const MockImap = jest.fn().mockImplementation(() => ({
    once: jest.fn((event: string, cb: any) => {
      if (mockOnceImpl) mockOnceImpl(event, cb);
    }),
    connect: jest.fn(() => {
      if (mockConnectImpl) mockConnectImpl();
    }),
    end: jest.fn(),
    openBox: jest.fn(),
    search: jest.fn(),
    fetch: jest.fn(),
    addFlags: jest.fn(),
  }));
  return MockImap;
});

jest.mock('mailparser', () => ({
  simpleParser: jest.fn().mockResolvedValue({
    messageId: '<test@example.com>',
    from: { value: [{ address: 'sender@example.com', name: 'Sender' }] },
    to: { value: [{ address: 'recipient@example.com', name: 'Recipient' }] },
    subject: 'Test Subject',
    text: 'Hello',
    html: '<p>Hello</p>',
    date: new Date('2026-01-01'),
    inReplyTo: undefined,
    references: undefined,
  }),
}));

import { SimpleImapAdapter } from '../adapters/simple-imap.adapter';

describe('SimpleImapAdapter', () => {
  let adapter: SimpleImapAdapter;
  const mockConfig = {
    host: 'imap.example.com',
    port: 993,
    secure: true,
    username: 'user@example.com',
    password: 'testpass',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnceImpl = null;
    mockConnectImpl = null;
    adapter = new SimpleImapAdapter(mockConfig);
  });

  describe('connect', () => {
    it('should connect to IMAP server', async () => {
      mockConnectImpl = () => {
        const Imap = require('imap');
        const inst = Imap.mock.results[0]?.value;
        if (inst) {
          const readyCb = inst.once.mock.calls.find((c: any[]) => c[0] === 'ready')?.[1];
          if (readyCb) setTimeout(readyCb, 0);
        }
      };

      await expect(adapter.connect()).resolves.toBeUndefined();
    });

    it('should reject on connection error', async () => {
      mockConnectImpl = () => {
        const Imap = require('imap');
        const inst = Imap.mock.results[0]?.value;
        if (inst) {
          const errCb = inst.once.mock.calls.find((c: any[]) => c[0] === 'error')?.[1];
          if (errCb) setTimeout(() => errCb(new Error('Connection refused')), 0);
        }
      };

      await expect(adapter.connect()).rejects.toThrow('Connection refused');
    });
  });

  describe('disconnect', () => {
    it('should disconnect gracefully', async () => {
      const Imap = require('imap');
      const mockImap = new Imap();
      mockImap.end = jest.fn();

      (adapter as any).imap = mockImap;
      await adapter.disconnect();
      expect(mockImap.end).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', async () => {
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('fetchUnseen', () => {
    it('should throw when not connected', async () => {
      await expect(adapter.fetchUnseen()).rejects.toThrow('IMAP not connected');
    });

    it('should return empty array when no unseen messages', async () => {
      const Imap = require('imap');
      const mockImap = new Imap();
      mockImap.openBox.mockImplementation((box: string, readOnly: boolean, cb: any) => {
        cb(null, { uidvalidity: 123 });
      });
      mockImap.search.mockImplementation((criteria: any, cb: any) => {
        cb(null, []);
      });

      (adapter as any).imap = mockImap;
      const result = await adapter.fetchUnseen();
      expect(result).toEqual([]);
      expect(adapter.uidValidity).toBe(123);
    });
  });

  describe('markAsRead', () => {
    it('should throw when not connected', async () => {
      await expect(adapter.markAsRead(1)).rejects.toThrow('IMAP not connected');
    });

    it('should add \\Seen flag', async () => {
      const Imap = require('imap');
      const mockImap = new Imap();
      mockImap.addFlags.mockImplementation((uid: number, flags: any, cb: any) => {
        cb(null);
      });

      (adapter as any).imap = mockImap;
      await expect(adapter.markAsRead(42)).resolves.toBeUndefined();
      expect(mockImap.addFlags).toHaveBeenCalledWith(42, ['\\Seen'], expect.any(Function));
    });

    it('should reject on flag error', async () => {
      const Imap = require('imap');
      const mockImap = new Imap();
      mockImap.addFlags.mockImplementation((uid: number, flags: any, cb: any) => {
        cb(new Error('Flag error'));
      });

      (adapter as any).imap = mockImap;
      await expect(adapter.markAsRead(42)).rejects.toThrow('Mark as read failed');
    });
  });

  describe('uidValidity', () => {
    it('should return 0 by default', () => {
      expect(adapter.uidValidity).toBe(0);
    });
  });
});
