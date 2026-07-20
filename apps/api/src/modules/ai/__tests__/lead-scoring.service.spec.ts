import { Test, TestingModule } from '@nestjs/testing';
import { LeadScoringService } from '../lead-scoring.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('LeadScoringService', () => {
  let service: LeadScoringService;

  const mockPrisma = {
    lead: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    leadScoreHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeadScoringService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<LeadScoringService>(LeadScoringService);
    jest.clearAllMocks();
  });

  describe('scoreLead', () => {
    it('should score a lead and return breakdown', async () => {
      const mockLead = {
        id: 'lead-1',
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao@test.com',
        phone: '+5511999999999',
        position: 'Gerente',
        companyName: 'Empresa X',
        source: 'WEBSITE',
        status: 'NEW',
        score: null,
        updatedAt: new Date(),
        owner: { id: 'user-1', firstName: 'Maria', lastName: 'Santos' },
        company: { id: 'comp-1', name: 'Empresa X', size: 'mid-market', industry: 'Tech' },
        activities: [{ id: 'a1', type: 'CALL', createdAt: new Date() }],
        conversations: [{ id: 'c1', status: 'active', createdAt: new Date() }],
        tasks: [{ id: 't1', status: 'DONE', completedAt: new Date() }],
      };

      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.leadScoreHistory.create.mockResolvedValue({});
      mockPrisma.lead.update.mockResolvedValue({});

      const result = await service.scoreLead('tenant-1', 'lead-1');

      expect(result.leadId).toBe('lead-1');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.classification).toBeDefined();
      expect(result.breakdown).toBeDefined();
      expect(result.factors).toBeInstanceOf(Array);
      expect(mockPrisma.leadScoreHistory.create).toHaveBeenCalled();
      expect(mockPrisma.lead.update).toHaveBeenCalled();
    });

    it('should throw if lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(service.scoreLead('tenant-1', 'nonexistent')).rejects.toThrow('Lead not found');
    });
  });

  describe('scoreAllLeads', () => {
    it('should score all active leads', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([{ id: 'lead-1' }, { id: 'lead-2' }]);
      mockPrisma.lead.findFirst
        .mockResolvedValueOnce({
          id: 'lead-1',
          firstName: 'A',
          lastName: 'B',
          source: 'WEBSITE',
          status: 'NEW',
          updatedAt: new Date(),
          activities: [],
          conversations: [],
          tasks: [],
        })
        .mockResolvedValueOnce({
          id: 'lead-2',
          firstName: 'C',
          lastName: 'D',
          source: 'REFERRAL',
          status: 'CONTACTED',
          updatedAt: new Date(),
          activities: [],
          conversations: [],
          tasks: [],
        });
      mockPrisma.leadScoreHistory.create.mockResolvedValue({});
      mockPrisma.lead.update.mockResolvedValue({});

      const result = await service.scoreAllLeads('tenant-1');

      expect(result.scored).toBe(2);
      expect(result.errors).toBe(0);
    });
  });

  describe('getScoreStats', () => {
    it('should return scoring statistics', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([{ score: 80 }, { score: 50 }, { score: 15 }]);

      const result = await service.getScoreStats('tenant-1');

      expect(result.totalLeads).toBe(3);
      expect(result.scoredLeads).toBe(3);
      expect(result.avgScore).toBe(48);
      expect(result.classifications).toBeDefined();
    });

    it('should handle empty leads', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);

      const result = await service.getScoreStats('tenant-1');

      expect(result.totalLeads).toBe(0);
      expect(result.avgScore).toBe(0);
    });
  });

  describe('getLeadsByScore', () => {
    it('should return leads by classification', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([
        { id: 'lead-1', firstName: 'Hot', lastName: 'Lead', score: 85 },
      ]);

      const result = await service.getLeadsByScore('tenant-1', 'muitoQuente');

      expect(result).toHaveLength(1);
      expect(mockPrisma.lead.findMany).toHaveBeenCalled();
    });
  });
});
