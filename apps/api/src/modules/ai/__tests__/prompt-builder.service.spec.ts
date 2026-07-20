import { Test, TestingModule } from '@nestjs/testing';
import { PromptBuilderService } from '../prompt-builder.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;

  const mockPrisma = {
    lead: { findFirst: jest.fn() },
    ticket: { findFirst: jest.fn() },
    aIPrompt: { findMany: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptBuilderService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PromptBuilderService>(PromptBuilderService);
    jest.clearAllMocks();
  });

  describe('buildLeadScoringPrompt', () => {
    it('should build a prompt for lead scoring', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao@test.com',
        companyName: 'Empresa X',
        position: 'Gerente',
        source: 'WEBSITE',
        score: 75,
        status: 'NEW',
        company: { name: 'Empresa X', size: 'mid-market', industry: 'Tech' },
        activities: [{ type: 'CALL', subject: 'Ligação inicial' }],
        conversations: [{ subject: 'Chat WhatsApp', status: 'active' }],
      });

      const result = await service.buildLeadScoringPrompt('tenant-1', 'lead-1');

      expect(result).toContain('João');
      expect(result).toContain('Empresa X');
    });

    it('should return empty string if lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      const result = await service.buildLeadScoringPrompt('tenant-1', 'nonexistent');

      expect(result).toBe('');
    });
  });

  describe('buildEmailGenerationPrompt', () => {
    it('should build email generation prompt', async () => {
      const result = await service.buildEmailGenerationPrompt('tenant-1', {
        entityType: 'lead',
        entityData: { firstName: 'João', lastName: 'Silva', companyName: 'Empresa X' },
        extra: { purpose: 'Follow-up', tone: 'Profissional' },
      });

      expect(result).toContain('email profissional');
      expect(result).toContain('João');
    });
  });

  describe('buildMessageGenerationPrompt', () => {
    it('should build message generation prompt', async () => {
      const result = await service.buildMessageGenerationPrompt('tenant-1', {
        entityType: 'lead',
        entityData: { firstName: 'João' },
        extra: { channel: 'WhatsApp', purpose: 'Apresentação' },
      });

      expect(result).toContain('WhatsApp');
      expect(result).toContain('João');
    });
  });

  describe('getPromptTemplates', () => {
    it('should return prompt templates', async () => {
      mockPrisma.aIPrompt.findMany.mockResolvedValue([
        { id: 'p1', name: 'Template 1', prompt: 'Test prompt' },
      ]);

      const result = await service.getPromptTemplates('tenant-1');

      expect(result).toHaveLength(1);
    });
  });
});
