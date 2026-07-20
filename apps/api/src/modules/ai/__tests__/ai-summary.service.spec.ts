import { Test, TestingModule } from '@nestjs/testing';
import { AiSummaryService } from '../ai-summary.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AiSummaryService', () => {
  let service: AiSummaryService;

  const mockPrisma = {
    lead: { findFirst: jest.fn() },
    ticket: { findFirst: jest.fn() },
    deal: { findFirst: jest.fn() },
    conversation: { findFirst: jest.fn() },
    contact: { findFirst: jest.fn() },
    company: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiSummaryService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AiSummaryService>(AiSummaryService);
    jest.clearAllMocks();
  });

  describe('summarizeLead', () => {
    it('should summarize a lead', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1',
        firstName: 'João',
        lastName: 'Silva',
        status: 'NEW',
        companyName: 'Empresa X',
        position: 'Gerente',
        score: 75,
        owner: { firstName: 'Maria', lastName: 'Santos' },
        activities: [{ id: 'a1' }, { id: 'a2' }],
        conversations: [{ id: 'c1' }],
        tasks: [
          { id: 't1', status: 'DONE' },
          { id: 't2', status: 'TODO' },
        ],
      });

      const result = await service.summarizeLead('tenant-1', 'lead-1');

      expect(result.entityType).toBe('lead');
      expect(result.entityId).toBe('lead-1');
      expect(result.summary).toContain('João');
      expect(result.highlights.length).toBeGreaterThan(0);
      expect(result.metrics.activities).toBe(2);
    });

    it('should throw if lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      await expect(service.summarizeLead('tenant-1', 'nonexistent')).rejects.toThrow(
        'Lead not found',
      );
    });
  });

  describe('summarizeTicket', () => {
    it('should summarize a ticket', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-1',
        subject: 'Problema com login',
        status: 'open',
        priority: 'high',
        reopenedCount: 0,
        _count: { ticketComment: 3, ticketHistory: 5 },
      });

      const result = await service.summarizeTicket('tenant-1', 'ticket-1');

      expect(result.entityType).toBe('ticket');
      expect(result.summary).toContain('Problema com login');
      expect(result.metrics.comments).toBe(3);
    });
  });

  describe('summarize', () => {
    it('should dispatch to correct summarizer', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1',
        firstName: 'A',
        lastName: 'B',
        status: 'NEW',
        score: 50,
        activities: [],
        conversations: [],
        tasks: [],
      });

      const result = await service.summarize('tenant-1', 'lead', 'lead-1');
      expect(result.entityType).toBe('lead');
    });

    it('should throw for unsupported entity type', async () => {
      await expect(service.summarize('tenant-1', 'unsupported', 'id')).rejects.toThrow(
        'Unsupported entity type',
      );
    });
  });
});
