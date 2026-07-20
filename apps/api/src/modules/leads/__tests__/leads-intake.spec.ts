import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from '../leads.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventBusService } from '../../../infrastructure/event-bus/event-bus.service';
import { LeadDistributionService } from '../lead-distribution.service';
import { LeadSource } from '@prisma/client';

describe('LeadsService — intake (dedup)', () => {
  let service: LeadsService;

  const mockPrisma = {
    lead: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
    },
  };

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockDistribution = {
    getConfig: jest.fn().mockResolvedValue({
      enabled: true,
      strategy: 'round_robin',
      eligibleUserIds: [],
      fallbackBehavior: 'UNASSIGNED',
      notifyOnAssignment: true,
    }),
    distributeRoundRobin: jest.fn().mockResolvedValue({
      leadId: 'lead-new',
      assignedTo: 'user-1',
      assignedToName: 'Alice Smith',
      strategy: 'round_robin',
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockEventBus.publish.mockResolvedValue(undefined);
    mockDistribution.getConfig.mockResolvedValue({
      enabled: true,
      strategy: 'round_robin',
      eligibleUserIds: [],
      fallbackBehavior: 'UNASSIGNED',
      notifyOnAssignment: true,
    });
    mockDistribution.distributeRoundRobin.mockResolvedValue({
      leadId: 'lead-new',
      assignedTo: 'user-1',
      assignedToName: 'Alice Smith',
      strategy: 'round_robin',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: LeadDistributionService, useValue: mockDistribution },
      ],
    }).compile();

    service = module.get(LeadsService);
  });

  const tenantId = 'tenant-1';

  describe('new lead intake', () => {
    it('should create lead when no duplicate exists', async () => {
      let findFirstCall = 0;
      mockPrisma.lead.findFirst.mockImplementation(async () => {
        findFirstCall++;
        if (findFirstCall === 1) return null;
        return {
          id: 'lead-new',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+5511999999999',
          source: 'LANDING_PAGE',
          status: 'NEW',
          tenantId,
          owner: null,
        };
      });
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      mockPrisma.lead.create.mockResolvedValue({
        id: 'lead-new',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+5511999999999',
        source: 'LANDING_PAGE',
        status: 'NEW',
        tenantId,
        owner: null,
      });

      const result = await service.intake(tenantId, {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+5511999999999',
        company: 'Acme Inc',
        message: 'Interested',
        source: LeadSource.LANDING_PAGE,
        tenantId,
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.lead!.id).toBe('lead-new');
      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            source: 'LANDING_PAGE',
          }),
        }),
      );
    });

    it('should normalize email to lowercase', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      mockPrisma.lead.create.mockResolvedValue({
        id: 'lead-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'NEW',
        tenantId,
        owner: null,
      });

      await service.intake(tenantId, {
        name: 'John Doe',
        email: '  JOHN@EXAMPLE.COM  ',
        source: LeadSource.EMAIL,
        tenantId,
      });

      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'john@example.com',
          }),
        }),
      );
    });

    it('should split single-word name as firstName only', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      mockPrisma.lead.create.mockResolvedValue({
        id: 'lead-1',
        firstName: 'Madonna',
        lastName: 'Madonna',
        status: 'NEW',
        tenantId,
        owner: null,
      });

      await service.intake(tenantId, {
        name: 'Madonna',
        source: LeadSource.MANUAL,
        tenantId,
      });

      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'Madonna',
            lastName: 'Madonna',
          }),
        }),
      );
    });
  });

  describe('duplicate detection', () => {
    it('should update existing lead on duplicate email', async () => {
      const existingLead = {
        id: 'existing-lead',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'NEW',
        owner: { id: 'user-1', firstName: 'Alice', lastName: 'Smith' },
      };

      mockPrisma.lead.findFirst.mockResolvedValue(existingLead);
      mockPrisma.lead.update.mockResolvedValue({});

      const result = await service.intake(tenantId, {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+5511888888888',
        company: 'New Company',
        message: 'Updated message',
        source: LeadSource.WHATSAPP,
        tenantId,
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.lead!.id).toBe('existing-lead');
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'existing-lead' },
        data: {
          phone: '+5511888888888',
          companyName: 'New Company',
          description: 'Updated message',
        },
      });
    });

    it('should not match CONVERTED leads as duplicates', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      mockPrisma.lead.create.mockResolvedValue({
        id: 'lead-new',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'NEW',
        tenantId,
        owner: null,
      });

      const result = await service.intake(tenantId, {
        name: 'John Doe',
        email: 'john@example.com',
        source: LeadSource.WEBSITE,
        tenantId,
      });

      expect(result.isDuplicate).toBe(false);
      expect(mockPrisma.lead.create).toHaveBeenCalled();
    });

    it('should publish LeadIntakeEvent on duplicate detection', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'existing-lead',
        email: 'john@example.com',
        status: 'NEW',
        owner: null,
      });
      mockPrisma.lead.update.mockResolvedValue({});

      await service.intake(tenantId, {
        name: 'John Doe',
        email: 'john@example.com',
        source: LeadSource.EMAIL,
        tenantId,
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'lead.intake',
          payload: expect.objectContaining({
            isDuplicate: true,
            originalLeadId: 'existing-lead',
          }),
        }),
      );
    });
  });

  describe('distribution integration', () => {
    it('should call distributeRoundRobin after creating new lead when enabled', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      mockPrisma.lead.create.mockResolvedValue({
        id: 'lead-new',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'NEW',
        tenantId,
        owner: null,
      });

      await service.intake(tenantId, {
        name: 'John Doe',
        email: 'john@example.com',
        source: LeadSource.LANDING_PAGE,
        tenantId,
      });

      expect(mockDistribution.getConfig).toHaveBeenCalledWith(tenantId);
      expect(mockDistribution.distributeRoundRobin).toHaveBeenCalledWith(
        tenantId,
        'lead-new',
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          source: 'LANDING_PAGE',
        },
      );
    });

    it('should not call distribute when distribution is disabled', async () => {
      mockDistribution.getConfig.mockResolvedValue({
        enabled: false,
        strategy: 'round_robin',
      });

      mockPrisma.lead.findFirst.mockResolvedValue(null);
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      mockPrisma.lead.create.mockResolvedValue({
        id: 'lead-new',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'NEW',
        tenantId,
        owner: null,
      });

      await service.intake(tenantId, {
        name: 'John Doe',
        email: 'john@example.com',
        source: LeadSource.LANDING_PAGE,
        tenantId,
      });

      expect(mockDistribution.distributeRoundRobin).not.toHaveBeenCalled();
    });

    it('should not call distribute on duplicate', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'existing-lead',
        email: 'john@example.com',
        status: 'NEW',
        owner: null,
      });
      mockPrisma.lead.update.mockResolvedValue({});

      await service.intake(tenantId, {
        name: 'John Doe',
        email: 'john@example.com',
        source: LeadSource.EMAIL,
        tenantId,
      });

      expect(mockDistribution.distributeRoundRobin).not.toHaveBeenCalled();
    });

    it('should still return lead even if distribution fails', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'lead-new',
        firstName: 'John',
        lastName: 'Doe',
        status: 'NEW',
        tenantId,
        owner: null,
      });
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      mockPrisma.lead.create.mockResolvedValue({
        id: 'lead-new',
        firstName: 'John',
        lastName: 'Doe',
        status: 'NEW',
        tenantId,
        owner: null,
      });
      mockDistribution.distributeRoundRobin.mockRejectedValue(new Error('No eligible users'));

      const result = await service.intake(tenantId, {
        name: 'John Doe',
        source: LeadSource.WEBSITE,
        tenantId,
      });

      expect(result.lead!.id).toBe('lead-new');
      expect(result.isDuplicate).toBe(false);
    });
  });
});
