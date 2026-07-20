import { Test, TestingModule } from '@nestjs/testing';
import { LeadDistributionService } from '../lead-distribution.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventBusService } from '../../../infrastructure/event-bus/event-bus.service';
import { NotificationsService } from '../../notifications/notifications.service';

describe('LeadDistributionService', () => {
  let service: LeadDistributionService;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    lead: {
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
  };

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotifications = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockEventBus.publish.mockResolvedValue(undefined);
    mockNotifications.send.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadDistributionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get(LeadDistributionService);
  });

  describe('getConfig', () => {
    it('should return default config when tenant has no settings', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        settings: {},
      });

      const result = await service.getConfig('tenant-1');

      expect(result.enabled).toBe(false);
      expect(result.strategy).toBe('round_robin');
      expect(result.eligibleUserIds).toEqual([]);
      expect(result.fallbackBehavior).toBe('UNASSIGNED');
      expect(result.notifyOnAssignment).toBe(true);
    });

    it('should return merged config from tenant settings', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        settings: {
          leadDistribution: {
            enabled: true,
            strategy: 'manual',
            eligibleUserIds: ['user-1', 'user-2'],
            fallbackBehavior: 'MANUAL_QUEUE',
            notifyOnAssignment: false,
          },
        },
      });

      const result = await service.getConfig('tenant-1');

      expect(result.enabled).toBe(true);
      expect(result.strategy).toBe('manual');
      expect(result.eligibleUserIds).toEqual(['user-1', 'user-2']);
      expect(result.fallbackBehavior).toBe('MANUAL_QUEUE');
      expect(result.notifyOnAssignment).toBe(false);
    });

    it('should return defaults when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      const result = await service.getConfig('nonexistent');

      expect(result.enabled).toBe(false);
    });
  });

  describe('distributeRoundRobin', () => {
    const tenantId = 'tenant-1';
    const leadId = 'lead-1';
    const leadData = { firstName: 'John', lastName: 'Doe', source: 'landing_page' };

    beforeEach(() => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {
          leadDistribution: {
            enabled: true,
            strategy: 'round_robin',
            eligibleUserIds: [],
            fallbackBehavior: 'UNASSIGNED',
            notifyOnAssignment: true,
          },
        },
      });
    });

    it('should assign lead to first user when no previous counter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', firstName: 'Alice', lastName: 'Smith' },
        { id: 'user-2', firstName: 'Bob', lastName: 'Jones' },
      ]);
      mockPrisma.lead.update.mockResolvedValue({});

      const result = await service.distributeRoundRobin(tenantId, leadId, leadData);

      expect(result).toEqual({
        leadId,
        assignedTo: 'user-1',
        assignedToName: 'Alice Smith',
        strategy: 'round_robin',
      });

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: {
          ownerId: 'user-1',
          assignedAt: expect.any(Date),
          assignedBy: 'system-round-robin',
        },
      });
    });

    it('should rotate to next user on successive calls', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', firstName: 'Alice', lastName: 'Smith' },
        { id: 'user-2', firstName: 'Bob', lastName: 'Jones' },
      ]);
      mockPrisma.lead.update.mockResolvedValue({});

      await service.distributeRoundRobin(tenantId, leadId, leadData);

      const result2 = await service.distributeRoundRobin(tenantId, 'lead-2', leadData);
      expect(result2?.assignedTo).toBe('user-2');

      const result3 = await service.distributeRoundRobin(tenantId, 'lead-3', leadData);
      expect(result3?.assignedTo).toBe('user-1');
    });

    it('should return null when no eligible users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.distributeRoundRobin(tenantId, leadId, leadData);
      expect(result).toBeNull();
    });

    it('should return null when distribution is disabled', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {
          leadDistribution: {
            enabled: false,
          },
        },
      });

      const result = await service.distributeRoundRobin(tenantId, leadId, leadData);
      expect(result).toBeNull();
    });

    it('should filter eligible users by configured IDs', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {
          leadDistribution: {
            enabled: true,
            eligibleUserIds: ['user-2'],
          },
        },
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-2', firstName: 'Bob', lastName: 'Jones' },
      ]);
      mockPrisma.lead.update.mockResolvedValue({});

      const result = await service.distributeRoundRobin(tenantId, leadId, leadData);

      expect(result?.assignedTo).toBe('user-2');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['user-2'] },
          }),
        }),
      );
    });

    it('should publish LeadAssignedEvent', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', firstName: 'Alice', lastName: 'Smith' },
      ]);
      mockPrisma.lead.update.mockResolvedValue({});

      await service.distributeRoundRobin(tenantId, leadId, leadData);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'lead.assigned',
          aggregateId: leadId,
          tenantId,
          payload: expect.objectContaining({
            assignedTo: 'user-1',
            strategy: 'round_robin',
          }),
        }),
      );
    });

    it('should send notification when notifyOnAssignment is true', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', firstName: 'Alice', lastName: 'Smith' },
      ]);
      mockPrisma.lead.update.mockResolvedValue({});

      await service.distributeRoundRobin(tenantId, leadId, leadData);

      expect(mockNotifications.send).toHaveBeenCalledWith(
        tenantId,
        'user-1',
        expect.objectContaining({
          title: 'Novo lead atribuído',
          body: expect.stringContaining('John Doe'),
          type: 'info',
          channel: 'in_app',
          category: 'lead',
        }),
      );
    });

    it('should not send notification when notifyOnAssignment is false', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {
          leadDistribution: {
            enabled: true,
            notifyOnAssignment: false,
          },
        },
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', firstName: 'Alice', lastName: 'Smith' },
      ]);
      mockPrisma.lead.update.mockResolvedValue({});

      await service.distributeRoundRobin(tenantId, leadId, leadData);

      expect(mockNotifications.send).not.toHaveBeenCalled();
    });

    it('should handle fallback with UNASSIGNED behavior', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {
          leadDistribution: {
            enabled: true,
            fallbackBehavior: 'UNASSIGNED',
          },
        },
      });
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.distributeRoundRobin(tenantId, leadId, leadData);

      expect(result).toBeNull();
    });

    it('should handle fallback with MANUAL_QUEUE behavior', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {
          leadDistribution: {
            enabled: true,
            fallbackBehavior: 'MANUAL_QUEUE',
          },
        },
      });
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.distributeRoundRobin(tenantId, leadId, leadData);

      expect(result).toBeNull();
    });
  });

  describe('assignManual', () => {
    const tenantId = 'tenant-1';
    const leadId = 'lead-1';
    const targetUserId = 'user-2';
    const assignedByUserId = 'user-1';

    beforeEach(() => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {
          leadDistribution: {
            enabled: true,
            notifyOnAssignment: true,
          },
        },
      });

      mockPrisma.user.findFirst.mockImplementation(async (args: any) => {
        if (args.where.id === targetUserId) {
          return { id: targetUserId, firstName: 'Bob', lastName: 'Jones' };
        }
        if (args.where.id === assignedByUserId) {
          return { firstName: 'Alice', lastName: 'Smith' };
        }
        return null;
      });

      mockPrisma.lead.findFirst.mockResolvedValue({
        id: leadId,
        ownerId: null,
        firstName: 'John',
        lastName: 'Doe',
      });
      mockPrisma.lead.update.mockResolvedValue({});
    });

    it('should assign lead to target user', async () => {
      const result = await service.assignManual(
        tenantId,
        leadId,
        targetUserId,
        assignedByUserId,
      );

      expect(result).toEqual({
        leadId,
        assignedTo: targetUserId,
        assignedToName: 'Bob Jones',
        strategy: 'manual',
      });
    });

    it('should throw if target user not found', async () => {
      mockPrisma.user.findFirst.mockImplementation(async (args: any) => {
        if (args.where.id === 'nonexistent') return null;
        return { firstName: 'Alice', lastName: 'Smith' };
      });
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: leadId, ownerId: null, firstName: 'John', lastName: 'Doe',
      });

      await expect(
        service.assignManual(tenantId, leadId, 'nonexistent', assignedByUserId),
      ).rejects.toThrow('Target user not found or inactive');
    });

    it('should throw if lead not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: targetUserId, firstName: 'Bob', lastName: 'Jones',
      });
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.assignManual(tenantId, leadId, targetUserId, assignedByUserId),
      ).rejects.toThrow('Lead not found');
    });

    it('should publish LeadReassignedEvent when lead had previous owner', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: leadId,
        ownerId: 'user-3',
        firstName: 'John',
        lastName: 'Doe',
      });

      await service.assignManual(tenantId, leadId, targetUserId, assignedByUserId);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'lead.reassigned',
        }),
      );
    });

    it('should publish LeadAssignedEvent when lead had no previous owner', async () => {
      await service.assignManual(tenantId, leadId, targetUserId, assignedByUserId);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'lead.assigned',
        }),
      );
    });

    it('should include reason in notification when provided', async () => {
      await service.assignManual(
        tenantId,
        leadId,
        targetUserId,
        assignedByUserId,
        'Specialization match',
      );

      expect(mockNotifications.send).toHaveBeenCalledWith(
        tenantId,
        targetUserId,
        expect.objectContaining({
          body: expect.stringContaining('Specialization match'),
        }),
      );
    });

    it('should not send notification when notifyOnAssignment is false', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {
          leadDistribution: {
            enabled: true,
            notifyOnAssignment: false,
          },
        },
      });

      await service.assignManual(tenantId, leadId, targetUserId, assignedByUserId);

      expect(mockNotifications.send).not.toHaveBeenCalled();
    });
  });

  describe('getEligibleUsers', () => {
    const tenantId = 'tenant-1';

    it('should return all active users when no specific IDs configured', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {},
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', firstName: 'Alice', lastName: 'Smith' },
      ]);

      const result = await service.getEligibleUsers(tenantId);

      expect(result).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should filter by configured eligible user IDs', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {
          leadDistribution: {
            eligibleUserIds: ['user-2'],
          },
        },
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-2', firstName: 'Bob', lastName: 'Jones' },
      ]);

      const result = await service.getEligibleUsers(tenantId);

      expect(result).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['user-2'] },
          }),
        }),
      );
    });
  });
});
