import { Test, TestingModule } from '@nestjs/testing';
import { QuotesService } from '../quotes.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('QuotesService', () => {
  let service: QuotesService;

  const mockPrisma = {
    quote: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    quoteItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    quoteVersion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    quoteTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    timeline: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuotesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<QuotesService>(QuotesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated quotes', async () => {
      const mockQuotes = [{ id: '1', number: 'Q-2024-0001', title: 'Test' }];
      mockPrisma.$transaction.mockResolvedValue([mockQuotes, 1]);
      mockPrisma.quote.findMany.mockResolvedValue(mockQuotes);
      mockPrisma.quote.count.mockResolvedValue(1);

      const result = await service.findAll('tenant-1', {});
      expect(result.data).toBeDefined();
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll('tenant-1', { status: 'DRAFT' });

      const findManyArgs = mockPrisma.quote.findMany.mock.calls[0][0];
      expect(findManyArgs.where.status).toBe('DRAFT');
    });

    it('should filter by search term', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll('tenant-1', { search: 'CRM' });

      const findManyArgs = mockPrisma.quote.findMany.mock.calls[0][0];
      expect(findManyArgs.where.OR).toBeDefined();
      expect(findManyArgs.where.OR.length).toBe(3);
    });

    it('should paginate correctly', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 50]);

      await service.findAll('tenant-1', { page: 2, limit: 10 });

      const findManyArgs = mockPrisma.quote.findMany.mock.calls[0][0];
      expect(findManyArgs.skip).toBe(10);
      expect(findManyArgs.take).toBe(10);
    });
  });

  describe('findById', () => {
    it('should return a quote', async () => {
      const mockQuote = { id: '1', number: 'Q-001', title: 'Test' };
      mockPrisma.quote.findFirst.mockResolvedValue(mockQuote);

      const result = await service.findById('1', 'tenant-1');
      expect(result).toEqual(mockQuote);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(service.findById('999', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a quote with generated number', async () => {
      const mockCreated = { id: 'new-1', number: 'Q-2026-1234', title: 'Test' };
      mockPrisma.quote.create.mockResolvedValue(mockCreated);
      mockPrisma.quote.findFirst.mockResolvedValue(mockCreated);
      mockPrisma.quote.findUnique.mockResolvedValue(mockCreated);
      mockPrisma.quoteVersion.findFirst.mockResolvedValue(null);
      mockPrisma.quoteVersion.create.mockResolvedValue({});

      const result = await service.create('tenant-1', { title: 'Test' }, 'user-1');
      expect(result.number).toBeDefined();
    });

    it('should create quote with items', async () => {
      const mockCreated = { id: 'new-2', number: 'Q-2026-5678', title: 'Test with items' };
      mockPrisma.quote.create.mockResolvedValue(mockCreated);
      mockPrisma.quoteItem.findMany.mockResolvedValue([
        { id: 'i1', subtotal: 100, discount: 0, taxes: 10 },
      ]);
      mockPrisma.quote.findFirst.mockResolvedValue(mockCreated);
      mockPrisma.quote.findUnique.mockResolvedValue(mockCreated);
      mockPrisma.quote.update.mockResolvedValue(mockCreated);
      mockPrisma.quoteVersion.findFirst.mockResolvedValue(null);
      mockPrisma.quoteVersion.create.mockResolvedValue({});

      const dto = {
        title: 'Test with items',
        items: [
          {
            description: 'Item 1',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      };

      const result = await service.create('tenant-1', dto, 'user-1');
      expect(result.number).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update a quote', async () => {
      const existing = { id: '1', title: 'Old', status: 'DRAFT' };
      const updated = { id: '1', title: 'Updated', status: 'DRAFT' };

      mockPrisma.quote.findFirst.mockResolvedValue(existing);
      mockPrisma.quote.update.mockResolvedValue(updated);
      mockPrisma.quote.findUnique.mockResolvedValue(updated);
      mockPrisma.quoteVersion.findFirst.mockResolvedValue({ version: 1 });
      mockPrisma.quoteVersion.create.mockResolvedValue({});

      const result = await service.update('1', 'tenant-1', { title: 'Updated' }, 'user-1');
      expect(result.title).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should soft delete a quote', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.quote.update.mockResolvedValue({ id: '1', deletedAt: new Date() });

      await service.remove('1', 'tenant-1', 'user-1');

      expect(mockPrisma.quote.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('archive', () => {
    it('should archive a quote', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.quote.update.mockResolvedValue({ id: '1', isArchived: true, status: 'ARCHIVED' });

      const result = await service.archive('1', 'tenant-1', 'user-1');
      expect(result.status).toBe('ARCHIVED');
    });
  });

  describe('duplicate', () => {
    it('should duplicate a quote', async () => {
      const original = {
        id: '1',
        number: 'Q-001',
        title: 'Original',
        status: 'DRAFT',
        items: [],
      };
      const duplicated = {
        id: 'dup-1',
        number: 'Q-2026-9999',
        title: 'Original (Copia)',
        status: 'DRAFT',
      };

      mockPrisma.quote.findFirst.mockResolvedValue(original);
      mockPrisma.quote.create.mockResolvedValue(duplicated);
      mockPrisma.quote.findUnique.mockResolvedValue(duplicated);
      mockPrisma.quoteVersion.findFirst.mockResolvedValue(null);
      mockPrisma.quoteVersion.create.mockResolvedValue({});

      const result = await service.duplicate('1', 'tenant-1', 'user-1');
      expect(result.title).toContain('Copia');
    });
  });

  describe('sendQuote', () => {
    it('should send a draft quote', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({ id: '1', status: 'DRAFT' });
      mockPrisma.quote.update.mockResolvedValue({ id: '1', status: 'SENT' });
      mockPrisma.quote.findUnique.mockResolvedValue({ id: '1', status: 'SENT' });
      mockPrisma.quoteVersion.findFirst.mockResolvedValue({ version: 1 });
      mockPrisma.quoteVersion.create.mockResolvedValue({});

      const result = await service.sendQuote('1', 'tenant-1', 'user-1');
      expect(result.status).toBe('SENT');
    });

    it('should throw for non-draft quotes', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({ id: '1', status: 'ACCEPTED' });

      await expect(service.sendQuote('1', 'tenant-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      mockPrisma.quote.count.mockResolvedValue(10);
      mockPrisma.quote.groupBy.mockResolvedValue([
        { status: 'ACCEPTED', _count: 5 },
        { status: 'REJECTED', _count: 3 },
      ]);
      mockPrisma.quote.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 50000 }, _avg: { totalAmount: 5000 } })
        .mockResolvedValueOnce({ _avg: { totalAmount: 5000 } });

      const result = await service.getStats('tenant-1');
      expect(result.total).toBe(10);
      expect(result.conversionRate).toBeDefined();
    });
  });

  describe('items management', () => {
    it('should add an item', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.quoteItem.create.mockResolvedValue({ id: 'i1', description: 'Test Item' });
      mockPrisma.quote.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.quote.update.mockResolvedValue({});

      const result = await service.addItem('1', 'tenant-1', {
        description: 'Test Item',
        quantity: 2,
        unitPrice: 50,
      });
      expect(result.description).toBe('Test Item');
    });

    it('should remove an item', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.quoteItem.delete.mockResolvedValue({});
      mockPrisma.quoteItem.findMany.mockResolvedValue([]);
      mockPrisma.quote.findUnique.mockResolvedValue({
        id: '1',
        discountPercent: 0,
        taxes: 0,
        shipping: 0,
      });
      mockPrisma.quote.update.mockResolvedValue({});

      await service.removeItem('1', 'item-1', 'tenant-1');
      expect(mockPrisma.quoteItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
    });
  });

  describe('versions', () => {
    it('should get versions', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.quoteVersion.findMany.mockResolvedValue([
        { id: 'v1', version: 1, reason: 'Created' },
      ]);

      const result = await service.getVersions('1', 'tenant-1');
      expect(result.length).toBe(1);
    });

    it('should throw when restoring non-existent version', async () => {
      mockPrisma.quoteVersion.findFirst.mockResolvedValue(null);

      await expect(service.restoreVersion('1', 'v999', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should restore a version', async () => {
      const version = {
        id: 'v1',
        version: 1,
        quoteId: '1',
        data: {
          title: 'Restored Title',
          status: 'DRAFT',
          totalAmount: 1000,
          subtotal: 800,
          discount: 100,
          taxes: 50,
          paymentTerms: '30 days',
        },
      };

      mockPrisma.quoteVersion.findFirst.mockResolvedValue(version);
      mockPrisma.quote.update.mockResolvedValue({});
      mockPrisma.quote.findUnique.mockResolvedValue({ id: '1', items: [] });
      mockPrisma.quoteVersion.findFirst
        .mockResolvedValueOnce(version)
        .mockResolvedValueOnce({ version: 1 });
      mockPrisma.quoteVersion.create.mockResolvedValue({});
      mockPrisma.quote.findFirst.mockResolvedValue({ id: '1' });

      const result = await service.restoreVersion('1', 'v1', 'tenant-1', 'user-1');
      expect(result).toBeDefined();
    });
  });

  describe('templates', () => {
    it('should list templates', async () => {
      mockPrisma.quoteTemplate.findMany.mockResolvedValue([
        { id: 't1', name: 'Commercial', type: 'commercial' },
      ]);

      const result = await service.findTemplates('tenant-1');
      expect(result.length).toBe(1);
    });

    it('should create a template', async () => {
      const template = { id: 't1', name: 'Test', content: { header: 'Test' } };
      mockPrisma.quoteTemplate.create.mockResolvedValue(template);

      const result = await service.createTemplate('tenant-1', {
        name: 'Test',
        content: { header: 'Test' },
      });
      expect(result.name).toBe('Test');
    });

    it('should delete a template', async () => {
      mockPrisma.quoteTemplate.findFirst.mockResolvedValue({ id: 't1', tenantId: 'tenant-1' });
      mockPrisma.quoteTemplate.delete.mockResolvedValue({});

      await service.deleteTemplate('t1', 'tenant-1');
      expect(mockPrisma.quoteTemplate.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    });
  });

  describe('export', () => {
    it('should export as JSON', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({ id: '1', number: 'Q-001' });

      const result = await service.exportQuote('1', 'tenant-1', 'json');
      expect(result).toBeDefined();
    });

    it('should export as CSV', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: '1',
        number: 'Q-001',
        subtotal: 100,
        discount: 0,
        taxes: 10,
        totalAmount: 110,
        items: [
          {
            description: 'Test',
            quantity: 1,
            unitPrice: 100,
            subtotal: 100,
            discount: 0,
            taxes: 10,
            total: 110,
          },
        ],
      });

      const result = await service.exportQuote('1', 'tenant-1', 'csv');
      expect(typeof result).toBe('string');
      expect(result).toContain('Descricao');
    });
  });

  describe('reorder items', () => {
    it('should reorder items', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.quoteItem.update.mockResolvedValue({});
      mockPrisma.quoteItem.findMany.mockResolvedValue([
        { id: 'i2', sortOrder: 0 },
        { id: 'i1', sortOrder: 1 },
      ]);

      const result = await service.reorderItems('1', 'tenant-1', ['i2', 'i1']);
      expect(result.length).toBe(2);
    });
  });
});
