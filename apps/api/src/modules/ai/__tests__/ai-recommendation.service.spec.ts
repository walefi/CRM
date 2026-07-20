import { Test, TestingModule } from '@nestjs/testing';
import { AiRecommendationService } from '../ai-recommendation.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AiRecommendationService', () => {
  let service: AiRecommendationService;

  const mockPrisma = {
    aiRecommendation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    lead: { findMany: jest.fn() },
    deal: { findMany: jest.fn() },
    ticket: { findMany: jest.fn() },
    task: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiRecommendationService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AiRecommendationService>(AiRecommendationService);
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('should return stored recommendations', async () => {
      const mockRecs = [
        {
          id: 'rec-1',
          title: 'Test',
          type: 'follow_up',
          entityType: 'lead',
          entityId: 'l1',
          priority: 'high',
          score: 80,
          status: 'pending',
        },
      ];
      mockPrisma.aiRecommendation.findMany.mockResolvedValue(mockRecs);

      const result = await service.getRecommendations('tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test');
    });

    it('should generate recommendations if none stored', async () => {
      mockPrisma.aiRecommendation.findMany.mockResolvedValue([]);
      mockPrisma.lead.findMany.mockResolvedValue([]);
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.aiRecommendation.upsert.mockResolvedValue({});

      const result = await service.getRecommendations('tenant-1');

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('acceptRecommendation', () => {
    it('should accept a recommendation', async () => {
      mockPrisma.aiRecommendation.findFirst.mockResolvedValue({
        id: 'rec-1',
        type: 'follow_up',
        entityType: 'lead',
        entityId: 'l1',
      });
      mockPrisma.aiRecommendation.update.mockResolvedValue({});

      const result = await service.acceptRecommendation('tenant-1', 'rec-1');

      expect(result.success).toBe(true);
    });

    it('should throw if recommendation not found', async () => {
      mockPrisma.aiRecommendation.findFirst.mockResolvedValue(null);

      await expect(service.acceptRecommendation('tenant-1', 'nonexistent')).rejects.toThrow(
        'Recommendation not found',
      );
    });
  });

  describe('dismissRecommendation', () => {
    it('should dismiss a recommendation', async () => {
      mockPrisma.aiRecommendation.updateMany.mockResolvedValue({});

      const result = await service.dismissRecommendation('tenant-1', 'rec-1');

      expect(result.success).toBe(true);
    });
  });
});
