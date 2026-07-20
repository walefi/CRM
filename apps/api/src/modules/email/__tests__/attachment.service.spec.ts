import { Test, TestingModule } from '@nestjs/testing';
import { AttachmentService } from '../attachments/attachment.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttachmentValidator, AttachmentInput } from '../attachments/attachment-validator';

describe('AttachmentService', () => {
  let service: AttachmentService;

  const mockStorage = {
    put: jest.fn().mockResolvedValue({ key: 'test-key', provider: 'local', size: 100 }),
    get: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  const mockPrisma = {
    messageAttachment: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'StorageAdapter', useValue: mockStorage },
      ],
    }).compile();

    service = module.get<AttachmentService>(AttachmentService);
    jest.clearAllMocks();
  });

  describe('processAttachment', () => {
    it('should store a valid attachment', async () => {
      const input: AttachmentInput = {
        filename: 'test.pdf',
        contentType: 'application/pdf',
        size: 1024,
        content: Buffer.from('test content'),
      };

      mockPrisma.messageAttachment.findFirst.mockResolvedValue(null);
      mockPrisma.messageAttachment.create.mockResolvedValue({
        id: 'att-1',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        checksum: 'abc123',
        storageKey: 'tenant-1/emails/msg-1/2026/07/test.pdf',
        storageProvider: 'local',
        contentId: null,
      });

      const result = await service.processAttachment('tenant-1', 'msg-1', input);

      expect(result.record.filename).toBe('test.pdf');
      expect(result.record.size).toBe(1024);
      expect(mockStorage.put).toHaveBeenCalled();
      expect(mockPrisma.messageAttachment.create).toHaveBeenCalled();
    });

    it('should detect duplicate attachments', async () => {
      const input: AttachmentInput = {
        filename: 'test.pdf',
        contentType: 'application/pdf',
        size: 1024,
        content: Buffer.from('test content'),
      };

      mockPrisma.messageAttachment.findFirst.mockResolvedValue({
        id: 'existing-att',
        filename: 'test.pdf',
        checksum: 'existing-checksum',
      });

      const result = await service.processAttachment('tenant-1', 'msg-1', input);

      expect(result.warnings).toContain('duplicate_ignored');
      expect(mockStorage.put).not.toHaveBeenCalled();
    });
  });

  describe('processAttachments', () => {
    it('should process multiple attachments', async () => {
      const inputs: AttachmentInput[] = [
        { filename: 'a.pdf', contentType: 'application/pdf', size: 100, content: Buffer.from('a') },
        { filename: 'b.doc', contentType: 'application/msword', size: 200, content: Buffer.from('b') },
      ];

      mockPrisma.messageAttachment.findFirst.mockResolvedValue(null);
      mockPrisma.messageAttachment.create.mockResolvedValue({
        id: 'att-1', filename: 'a.pdf', mimeType: 'application/pdf',
        size: 100, checksum: 'abc', storageKey: 'key', storageProvider: 'local', contentId: null,
      });

      const results = await service.processAttachments('tenant-1', 'msg-1', inputs);

      expect(results).toHaveLength(2);
      expect(mockPrisma.messageAttachment.create).toHaveBeenCalledTimes(2);
    });

    it('should handle one failing attachment without stopping others', async () => {
      const inputs: AttachmentInput[] = [
        { filename: 'bad.exe', contentType: 'application/x-msdownload', size: 100, content: Buffer.from('bad') },
        { filename: 'good.pdf', contentType: 'application/pdf', size: 200, content: Buffer.from('good') },
      ];

      mockPrisma.messageAttachment.findFirst.mockResolvedValue(null);
      mockPrisma.messageAttachment.create.mockResolvedValue({
        id: 'att-2', filename: 'good.pdf', mimeType: 'application/pdf',
        size: 200, checksum: 'def', storageKey: 'key2', storageProvider: 'local', contentId: null,
      });

      const results = await service.processAttachments('tenant-1', 'msg-1', inputs);

      expect(results).toHaveLength(1);
      expect(results[0].record.filename).toBe('good.pdf');
    });
  });

  describe('getAttachment', () => {
    it('should return attachment with data', async () => {
      mockPrisma.messageAttachment.findFirst.mockResolvedValue({
        id: 'att-1', filename: 'test.pdf', storageKey: 'key-1', tenantId: 'tenant-1',
      });
      mockStorage.get.mockResolvedValue(Buffer.from('file content'));

      const result = await service.getAttachment('tenant-1', 'att-1');

      expect(result).not.toBeNull();
      expect(result!.record.id).toBe('att-1');
      expect(result!.data).toBeInstanceOf(Buffer);
    });

    it('should return null for non-existent attachment', async () => {
      mockPrisma.messageAttachment.findFirst.mockResolvedValue(null);

      const result = await service.getAttachment('tenant-1', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when storage data is missing', async () => {
      mockPrisma.messageAttachment.findFirst.mockResolvedValue({
        id: 'att-1', filename: 'test.pdf', storageKey: 'key-1', tenantId: 'tenant-1',
      });
      mockStorage.get.mockResolvedValue(null);

      const result = await service.getAttachment('tenant-1', 'att-1');

      expect(result).toBeNull();
    });
  });
});
