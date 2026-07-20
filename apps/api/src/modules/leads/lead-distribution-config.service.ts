import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  LeadDistributionConfigData,
  DEFAULT_LEAD_DISTRIBUTION_CONFIG,
  UpdateLeadDistributionConfigDto,
} from './dto/lead-distribution-config.dto';

@Injectable()
export class LeadDistributionConfigService {
  private readonly logger = new Logger(LeadDistributionConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfig(tenantId: string): Promise<LeadDistributionConfigData> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const settings = (tenant.settings as Record<string, unknown>) || {};
    const config = settings.leadDistribution as Partial<LeadDistributionConfigData> | undefined;

    return {
      ...DEFAULT_LEAD_DISTRIBUTION_CONFIG,
      ...(config || {}),
    };
  }

  async updateConfig(
    tenantId: string,
    dto: UpdateLeadDistributionConfigDto,
  ): Promise<LeadDistributionConfigData> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const currentSettings = (tenant.settings as Record<string, unknown>) || {};
    const currentConfig =
      (currentSettings.leadDistribution as Partial<LeadDistributionConfigData>) || {};

    const merged: LeadDistributionConfigData = {
      ...DEFAULT_LEAD_DISTRIBUTION_CONFIG,
      ...currentConfig,
      ...dto,
    };

    if (dto.eligibleUserIds) {
      await this.validateEligibleUsers(tenantId, dto.eligibleUserIds);
    }

    const updatedSettings = {
      ...currentSettings,
      leadDistribution: merged,
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings as unknown as Prisma.InputJsonValue },
    });

    await this.audit(tenantId, 'LEAD_DISTRIBUTION_CONFIG_UPDATED');

    this.logger.log(`Lead distribution config updated for tenant ${tenantId}`);

    return merged;
  }

  async getEligibleUsers(tenantId: string) {
    const config = await this.getConfig(tenantId);

    const where: any = {
      tenantId,
      status: 'ACTIVE',
      role: { in: ['admin', 'user'] },
    };

    if (config.eligibleUserIds.length > 0) {
      where.id = { in: config.eligibleUserIds };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatar: true,
      },
      orderBy: { firstName: 'asc' },
    });

    return { users, config };
  }

  private async validateEligibleUsers(tenantId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length !== userIds.length) {
      throw new BadRequestException('Duplicate user IDs are not allowed');
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        tenantId,
      },
      select: { id: true, status: true, tenantId: true },
    });

    if (users.length !== userIds.length) {
      const foundIds = new Set(users.map((u) => u.id));
      const missingIds = userIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `User IDs not found or do not belong to this tenant: ${missingIds.join(', ')}`,
      );
    }

    const inactiveUsers = users.filter((u) => u.status !== 'ACTIVE');
    if (inactiveUsers.length > 0) {
      throw new BadRequestException(
        `The following users are not active: ${inactiveUsers.map((u) => u.id).join(', ')}`,
      );
    }
  }

  private async audit(tenantId: string, action: string) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          entity: 'lead_distribution',
          tenantId,
          metadata: { timestamp: new Date().toISOString() },
        },
      });
    } catch (error) {
      this.logger.error('Audit log failed', error);
    }
  }
}
