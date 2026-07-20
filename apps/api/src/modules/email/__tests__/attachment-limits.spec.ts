import { Test, TestingModule } from '@nestjs/testing';
import { AttachmentService } from '../attachments/attachment.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttachmentInput } from '../attachments/attachment-validator';

describe('AttachmentService — FASE 7 Limits', () => {
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

  function makeInput(filename: string, size: number = 100): AttachmentInput {
    return {
      filename,
      contentType: 'application/pdf',
      size,
      content: Buffer.alloc(size),
    };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'StorageAdapter', useValue: mockStorage },
      ],
    }).compile();

    service = module.get<AttachmentService>(AttachmentService);
    mockPrisma.messageAttachment.findFirst.mockReset();
    mockPrisma.messageAttachment.create.mockReset();
    mockStorage.put.mockReset();
    mockStorage.put.mockResolvedValue({ key: 'k', provider: 'local', size: 100 });

    mockPrisma.messageAttachment.create.mockImplementation((data: any) =>
      Promise.resolve({
        id: 'att-new',
        ...data.data,
        storageProvider: data.data.storageProvider || 'local',
      }),
    );
  });

  describe('per-file size limit', () => {
    it('should reject attachments exceeding max file size', async () => {
      const oversized: AttachmentInput = {
        filename: 'huge.pdf',
        contentType: 'application/pdf',
        size: 50 * 1024 * 1024,
        content: Buffer.alloc(50 * 1024 * 1024),
      };

      await expect(
        service.processAttachment('tenant-1', 'msg-1', oversized),
      ).rejects.toThrow('exceeds max');
    });
  });

  describe('per-email attachment count limit', () => {
    it('should truncate when exceeding max attachments per email', async () => {
      service.configureLimits({ maxAttachmentsPerEmail: 3 });
      mockPrisma.messageAttachment.findFirst.mockResolvedValue(null);

      const inputs = Array.from({ length: 10 }, (_, i) =>
        makeInput(`file${i}.pdf`),
      );

      const results = await service.processAttachments('tenant-1', 'msg-1', inputs);

      expect(results).toHaveLength(3);
    });

    it('should process all attachments when within limit', async () => {
      service.configureLimits({ maxAttachmentsPerEmail: 10 });
      mockPrisma.messageAttachment.findFirst.mockResolvedValue(null);

      const inputs = [makeInput('a.pdf'), makeInput('b.pdf'), makeInput('c.pdf')];

      const results = await service.processAttachments('tenant-1', 'msg-1', inputs);

      expect(results).toHaveLength(3);
    });
  });

  describe('per-email total bytes limit', () => {
    it('should stop processing when total bytes limit reached', async () => {
      service.configureLimits({ maxTotalBytesPerEmail: 500 });
      mockPrisma.messageAttachment.findFirst.mockResolvedValue(null);

      const inputs = [
        makeInput('big1.pdf', 200),
        makeInput('big2.pdf', 200),
        makeInput('big3.pdf', 200),
      ];

      const results = await service.processAttachments('tenant-1', 'msg-1', inputs);

      expect(results.length).toBeLessThan(3);
    });

    it('should not break mid-attachment', async () => {
      service.configureLimits({ maxTotalBytesPerEmail: 500 });
      mockPrisma.messageAttachment.findFirst.mockResolvedValue(null);

      const inputs = [
        makeInput('file1.pdf', 400),
        makeInput('file2.pdf', 400),
      ];

      const results = await service.processAttachments('tenant-1', 'msg-1', inputs);

      expect(results).toHaveLength(1);
      expect(results[0].record.filename).toBe('file1.pdf');
    });
  });

  describe('configureLimits', () => {
    it('should allow overriding limits', async () => {
      service.configureLimits({ maxAttachmentsPerEmail: 1, maxTotalBytesPerEmail: 10000 });
      mockPrisma.messageAttachment.findFirst.mockResolvedValue(null);

      const inputs = [makeInput('a.pdf'), makeInput('b.pdf')];

      const results = await service.processAttachments('tenant-1', 'msg-1', inputs);

      expect(results).toHaveLength(1);
    });
  });
});
