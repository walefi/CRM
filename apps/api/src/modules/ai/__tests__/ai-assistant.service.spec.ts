import { Test, TestingModule } from '@nestjs/testing';
import { AiAssistantService } from '../ai-assistant.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AiAssistantService', () => {
  let service: AiAssistantService;

  const mockPrisma = {
    lead: { findMany: jest.fn(), count: jest.fn() },
    deal: { findMany: jest.fn(), count: jest.fn() },
    task: { findMany: jest.fn(), count: jest.fn() },
    ticket: { count: jest.fn(), groupBy: jest.fn() },
    user: { findMany: jest.fn() },
    company: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiAssistantService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AiAssistantService>(AiAssistantService);
    jest.clearAllMocks();
  });

  describe('ask', () => {
    it('should answer about hot leads', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([
        {
          id: 'lead-1',
          firstName: 'Hot',
          lastName: 'Lead',
          score: 85,
          status: 'NEW',
          source: 'WEBSITE',
          companyName: 'X',
        },
      ]);

      const result = await service.ask('tenant-1', 'Quais leads têm maior chance de conversão?');

      expect(result.answer).toContain('Hot');
      expect(result.data).toHaveLength(1);
      expect(result.sources).toContain('leads');
    });

    it('should answer about stale deals', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([
        {
          id: 'deal-1',
          title: 'Deal parado',
          value: 10000,
          status: 'proposal',
          updatedAt: new Date('2026-01-01'),
        },
      ]);

      const result = await service.ask('tenant-1', 'Quais negócios estão parados?');

      expect(result.answer).toContain('Deal parado');
      expect(result.data).toHaveLength(1);
    });

    it('should answer about overdue tasks', async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Tarefa atrasada',
          status: 'TODO',
          priority: 'HIGH',
          dueDate: new Date('2026-01-01'),
        },
      ]);

      const result = await service.ask('tenant-1', 'Quais tarefas estão atrasadas?');

      expect(result.answer).toContain('Tarefa atrasada');
    });

    it('should answer about ticket status', async () => {
      mockPrisma.ticket.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);
      mockPrisma.ticket.groupBy.mockResolvedValue([
        { priority: 'high', _count: 3 },
        { priority: 'low', _count: 2 },
      ]);

      const result = await service.ask('tenant-1', 'Quais tickets precisam de atenção?');

      expect(result.answer).toContain('tickets');
    });

    it('should answer dashboard question', async () => {
      mockPrisma.lead.count.mockResolvedValue(10);
      mockPrisma.deal.count.mockResolvedValue(5);
      mockPrisma.task.count.mockResolvedValue(3);
      mockPrisma.ticket.count.mockResolvedValue(2);

      const result = await service.ask('tenant-1', 'Me dê um resumo geral');

      expect(result.answer).toContain('Leads ativos');
      expect(result.data.leads).toBe(10);
    });

    it('should return generic answer for unknown question', async () => {
      const result = await service.ask('tenant-1', 'Qual é a capital da França?');

      expect(result.answer).toContain('Desculpe');
    });
  });
});
