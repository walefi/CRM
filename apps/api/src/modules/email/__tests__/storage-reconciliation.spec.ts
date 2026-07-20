import { Test, TestingModule } from '@nestjs/testing';
import { StorageReconciliationService, ReconciliationIssueType } from '../attachments/storage-reconciliation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageAdapter } from '../../../infrastructure/storage/storage.adapter';

describe('StorageReconciliationService', () => {
  let service: StorageReconciliationService;

  const mockStorage = {
    put: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  const mockPrisma = {
    messageAttachment: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageReconciliationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'StorageAdapter', useValue: mockStorage },
      ],
    }).compile();

    service = module.get<StorageReconciliationService>(StorageReconciliationService);
    mockPrisma.messageAttachment.findMany.mockReset();
    mockPrisma.messageAttachment.update.mockReset();
    mockStorage.exists.mockReset();
  });

  describe('reconcile', () => {
    it('should detect missing files (orphan records)', async () => {
      mockPrisma.messageAttachment.findMany
        .mockResolvedValueOnce([
          { id: 'att-1', tenantId: 't1', storageKey: 't1/key1', filename: 'a.pdf', metadata: null },
          { id: 'att-2', tenantId: 't1', storageKey: 't1/key2', filename: 'b.pdf', metadata: null },
        ])
        .mockResolvedValueOnce([]);

      mockStorage.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await service.reconcile('t1', 100, true);

      expect(result.scanned).toBe(2);
      expect(result.missingFiles).toBe(1);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe(ReconciliationIssueType.MISSING_FILE);
      expect(result.issues[0].attachmentId).toBe('att-2');
    });

    it('should return empty issues when all files exist', async () => {
      mockPrisma.messageAttachment.findMany
        .mockResolvedValueOnce([
          { id: 'att-1', tenantId: 't1', storageKey: 't1/key1', filename: 'a.pdf', metadata: null },
        ])
        .mockResolvedValueOnce([]);

      mockStorage.exists.mockResolvedValue(true);

      const result = await service.reconcile('t1', 100, true);

      expect(result.scanned).toBe(1);
      expect(result.issues).toHaveLength(0);
      expect(result.missingFiles).toBe(0);
    });

    it('should handle empty database', async () => {
      mockPrisma.messageAttachment.findMany.mockResolvedValueOnce([]);

      const result = await service.reconcile('t1', 100, true);

      expect(result.scanned).toBe(0);
      expect(result.issues).toHaveLength(0);
    });

    it('should paginate through large datasets', async () => {
      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `att-${i}`,
        tenantId: 't1',
        storageKey: `t1/key${i}`,
        filename: `file${i}.pdf`,
        metadata: null,
      }));

      mockPrisma.messageAttachment.findMany
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce([]);

      mockStorage.exists.mockResolvedValue(true);

      const result = await service.reconcile('t1', 200, true);

      expect(result.scanned).toBe(100);
    });

    it('should respect limit parameter', async () => {
      mockPrisma.messageAttachment.findMany
        .mockResolvedValueOnce([
          { id: 'att-1', tenantId: 't1', storageKey: 'k1', filename: 'f.pdf', metadata: null },
        ])
        .mockResolvedValueOnce([]);

      mockStorage.exists.mockResolvedValue(true);

      const result = await service.reconcile('t1', 1, true);

      expect(result.scanned).toBe(1);
    });

    it('should detect multiple missing files across pages', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({
        id: `att-${i}`,
        tenantId: 't1',
        storageKey: `t1/key${i}`,
        filename: `file${i}.pdf`,
        metadata: null,
      }));
      const page2 = [
        { id: 'att-100', tenantId: 't1', storageKey: 't1/key100', filename: 'file100.pdf', metadata: null },
      ];

      mockPrisma.messageAttachment.findMany
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2)
        .mockResolvedValueOnce([]);

      mockStorage.exists.mockImplementation(async (key: string) => {
        const idx = parseInt(key.split('/').pop()!.replace('key', ''));
        return idx % 10 !== 0;
      });

      const result = await service.reconcile('t1', 200, true);

      expect(result.scanned).toBe(101);
      expect(result.missingFiles).toBeGreaterThan(0);
    });

    it('should include durationMs in result', async () => {
      mockPrisma.messageAttachment.findMany.mockResolvedValueOnce([]);

      const result = await service.reconcile('t1', 100, true);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should scan across all tenants when tenantId is omitted', async () => {
      mockPrisma.messageAttachment.findMany
        .mockResolvedValueOnce([
          { id: 'att-1', tenantId: 't1', storageKey: 'k1', filename: 'f.pdf', metadata: null },
        ])
        .mockResolvedValueOnce([]);

      mockStorage.exists.mockResolvedValue(true);

      const result = await service.reconcile(undefined, 100, true);

      expect(result.scanned).toBe(1);
      expect(mockPrisma.messageAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('markMissingAttachments', () => {
    it('should mark missing attachments in metadata', async () => {
      mockPrisma.messageAttachment.findMany
        .mockResolvedValueOnce([
          { id: 'att-1', tenantId: 't1', storageKey: 'k1', filename: 'f.pdf', metadata: {} },
        ])
        .mockResolvedValueOnce([]);

      mockStorage.exists.mockResolvedValue(false);
      mockPrisma.messageAttachment.update.mockResolvedValue({});

      const result = await service.markMissingAttachments('t1', 100);

      expect(result.marked).toBe(1);
      expect(mockPrisma.messageAttachment.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: {
          metadata: expect.objectContaining({
            missing: true,
            missingDetectedAt: expect.any(String),
          }),
        },
      });
    });

    it('should not mark attachments that exist in storage', async () => {
      mockPrisma.messageAttachment.findMany
        .mockResolvedValueOnce([
          { id: 'att-1', tenantId: 't1', storageKey: 'k1', filename: 'f.pdf', metadata: {} },
        ])
        .mockResolvedValueOnce([]);

      mockStorage.exists.mockResolvedValue(true);

      const result = await service.markMissingAttachments('t1', 100);

      expect(result.marked).toBe(0);
      expect(mockPrisma.messageAttachment.update).not.toHaveBeenCalled();
    });

    it('should handle empty database', async () => {
      mockPrisma.messageAttachment.findMany.mockResolvedValueOnce([]);

      const result = await service.markMissingAttachments('t1', 100);

      expect(result.marked).toBe(0);
    });
  });
});
