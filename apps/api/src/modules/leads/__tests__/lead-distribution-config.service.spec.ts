import { Test, TestingModule } from '@nestjs/testing';
import { LeadDistributionConfigService } from '../lead-distribution-config.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DEFAULT_LEAD_DISTRIBUTION_CONFIG } from '../dto/lead-distribution-config.dto';

describe('LeadDistributionConfigService', () => {
  let service: LeadDistributionConfigService;

  const mockPrisma = {
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadDistributionConfigService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(LeadDistributionConfigService);
  });

  describe('getConfig', () => {
    const tenantId = 'tenant-1';

    it('should return default config when tenant has no settings', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {},
      });

      const result = await service.getConfig(tenantId);

      expect(result).toEqual(DEFAULT_LEAD_DISTRIBUTION_CONFIG);
    });

    it('should return merged config when tenant has settings', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {
          leadDistribution: {
            enabled: true,
            strategy: 'manual',
          },
        },
      });

      const result = await service.getConfig(tenantId);

      expect(result.enabled).toBe(true);
      expect(result.strategy).toBe('manual');
      expect(result.fallbackBehavior).toBe('UNASSIGNED');
      expect(result.notifyOnAssignment).toBe(true);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getConfig('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateConfig', () => {
    const tenantId = 'tenant-1';

    beforeEach(() => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {},
      });
      mockPrisma.tenant.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
    });

    it('should update config with valid data', async () => {
      const result = await service.updateConfig(tenantId, {
        enabled: true,
        strategy: 'round_robin',
      });

      expect(result.enabled).toBe(true);
      expect(result.strategy).toBe('round_robin');
      expect(mockPrisma.tenant.update).toHaveBeenCalled();
    });

    it('should validate eligible user IDs', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', status: 'ACTIVE', tenantId },
      ]);

      const result = await service.updateConfig(tenantId, {
        eligibleUserIds: ['user-1'],
      });

      expect(result.eligibleUserIds).toEqual(['user-1']);
    });

    it('should reject duplicate user IDs', async () => {
      await expect(
        service.updateConfig(tenantId, {
          eligibleUserIds: ['user-1', 'user-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject user IDs not belonging to tenant', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', status: 'ACTIVE', tenantId },
      ]);

      await expect(
        service.updateConfig(tenantId, {
          eligibleUserIds: ['user-1', 'user-2'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject inactive users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', status: 'INACTIVE', tenantId },
      ]);

      await expect(
        service.updateConfig(tenantId, {
          eligibleUserIds: ['user-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateConfig('nonexistent', { enabled: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should merge with existing config', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {
          leadDistribution: {
            enabled: false,
            strategy: 'manual',
            eligibleUserIds: ['user-1'],
          },
        },
      });

      const result = await service.updateConfig(tenantId, {
        enabled: true,
      });

      expect(result.enabled).toBe(true);
      expect(result.strategy).toBe('manual');
      expect(result.eligibleUserIds).toEqual(['user-1']);
    });
  });

  describe('getEligibleUsers', () => {
    const tenantId = 'tenant-1';

    it('should return all active users when no specific users configured', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {},
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com', role: 'admin', avatar: null },
        { id: 'user-2', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com', role: 'user', avatar: null },
      ]);

      const result = await service.getEligibleUsers(tenantId);

      expect(result.users).toHaveLength(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should return only configured users when specific IDs provided', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: tenantId,
        settings: {
          leadDistribution: {
            eligibleUserIds: ['user-1'],
          },
        },
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com', role: 'admin', avatar: null },
      ]);

      const result = await service.getEligibleUsers(tenantId);

      expect(result.users).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['user-1'] },
          }),
        }),
      );
    });
  });
});
