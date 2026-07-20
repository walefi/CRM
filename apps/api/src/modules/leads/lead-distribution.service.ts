import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { LeadAssignedEvent } from '../../infrastructure/event-bus/domain-events';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import {
  LeadDistributionConfigData,
  DEFAULT_LEAD_DISTRIBUTION_CONFIG,
} from './dto/lead-distribution-config.dto';

export interface DistributionResult {
  leadId: string;
  assignedTo: string;
  assignedToName: string;
  strategy: string;
}

@Injectable()
export class LeadDistributionService {
  private readonly logger = new Logger(LeadDistributionService.name);

  private roundRobinCounters = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getConfig(tenantId: string): Promise<LeadDistributionConfigData> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return DEFAULT_LEAD_DISTRIBUTION_CONFIG;

    const settings = (tenant.settings as Record<string, unknown>) || {};
    const config = settings.leadDistribution as Partial<LeadDistributionConfigData> | undefined;

    return {
      ...DEFAULT_LEAD_DISTRIBUTION_CONFIG,
      ...(config || {}),
    };
  }

  async distributeRoundRobin(
    tenantId: string,
    leadId: string,
    leadData: { firstName: string; lastName: string; email?: string; source?: string },
  ): Promise<DistributionResult | null> {
    const config = await this.getConfig(tenantId);

    if (!config.enabled) {
      this.logger.log(`Lead distribution is disabled for tenant ${tenantId}`);
      return this.handleFallback(tenantId, leadId, leadData, config, 'disabled');
    }

    const eligibleUsers = await this.getEligibleUsers(tenantId, config);

    if (eligibleUsers.length === 0) {
      this.logger.warn(`No eligible users for lead distribution in tenant ${tenantId}`);
      return this.handleFallback(tenantId, leadId, leadData, config, 'no_eligible_users');
    }

    const lastIndex = this.roundRobinCounters.get(tenantId) ?? -1;
    const nextIndex = (lastIndex + 1) % eligibleUsers.length;
    const selectedUser = eligibleUsers[nextIndex];

    this.roundRobinCounters.set(tenantId, nextIndex);

    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        ownerId: selectedUser.id,
        assignedAt: new Date(),
        assignedBy: 'system-round-robin',
      },
    });

    const assignedByName = 'Sistema de Distribuição';

    this.logger.log(
      `Lead ${leadId} (${leadData.firstName} ${leadData.lastName}) assigned to ${selectedUser.firstName} ${selectedUser.lastName} via round-robin`,
    );

    this.eventBus
      .publish(
        new LeadAssignedEvent(
          {
            id: leadId,
            assignedTo: selectedUser.id,
            assignedToName: `${selectedUser.firstName} ${selectedUser.lastName}`,
            assignedByName,
            strategy: 'round_robin',
            source: leadData.source,
          },
          tenantId,
        ),
      )
      .catch((error: any) =>
        this.logger.warn(`Failed to publish LeadAssignedEvent: ${error.message}`),
      );

    if (config.notifyOnAssignment) {
      this.notificationsService
        .send(tenantId, selectedUser.id, {
          title: 'Novo lead atribuído',
          body: `O lead ${leadData.firstName} ${leadData.lastName} foi atribuído a você.`,
          type: 'info',
          channel: 'in_app',
          category: 'lead',
          url: `/leads/${leadId}`,
          data: { leadId },
        })
        .catch((error: any) =>
          this.logger.warn(`Failed to send assignment notification: ${error.message}`),
        );
    }

    return {
      leadId,
      assignedTo: selectedUser.id,
      assignedToName: `${selectedUser.firstName} ${selectedUser.lastName}`,
      strategy: 'round_robin',
    };
  }

  async assignManual(
    tenantId: string,
    leadId: string,
    targetUserId: string,
    assignedByUserId: string,
    reason?: string,
  ): Promise<DistributionResult> {
    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!targetUser) {
      throw new Error('Target user not found or inactive');
    }

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId, deletedAt: null },
      select: { id: true, ownerId: true, firstName: true, lastName: true },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    const previousOwnerId = lead.ownerId;

    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        ownerId: targetUserId,
        assignedAt: new Date(),
        assignedBy: assignedByUserId,
      },
    });

    const assignedByUser = await this.prisma.user.findFirst({
      where: { id: assignedByUserId, tenantId },
      select: { firstName: true, lastName: true },
    });

    const assignedByName = assignedByUser
      ? `${assignedByUser.firstName} ${assignedByUser.lastName}`
      : 'Sistema';

    const eventName = previousOwnerId ? 'lead.reassigned' : 'lead.assigned';
    const EventClass = previousOwnerId
      ? (await import('../../infrastructure/event-bus/domain-events')).LeadReassignedEvent
      : (await import('../../infrastructure/event-bus/domain-events')).LeadAssignedEvent;

    this.eventBus
      .publish(
        new EventClass(
          {
            id: leadId,
            assignedTo: targetUserId,
            assignedToName: `${targetUser.firstName} ${targetUser.lastName}`,
            assignedByName,
            previousOwnerId,
            strategy: 'manual',
            reason,
          },
          tenantId,
          assignedByUserId,
        ),
      )
      .catch((error: any) =>
        this.logger.warn(`Failed to publish ${eventName}: ${error.message}`),
      );

    const config = await this.getConfig(tenantId);
    if (config.notifyOnAssignment) {
      this.notificationsService
        .send(tenantId, targetUserId, {
          title: previousOwnerId ? 'Lead reatribuído' : 'Novo lead atribuído',
          body: `O lead ${lead.firstName} ${lead.lastName} foi atribuído a você por ${assignedByName}.${reason ? ` Motivo: ${reason}` : ''}`,
          type: 'info',
          channel: 'in_app',
          category: 'lead',
          url: `/leads/${leadId}`,
          data: { leadId },
        })
        .catch((error: any) =>
          this.logger.warn(`Failed to send assignment notification: ${error.message}`),
        );
    }

    this.logger.log(
      `Lead ${leadId} assigned to ${targetUser.firstName} ${targetUser.lastName} by ${assignedByName}`,
    );

    return {
      leadId,
      assignedTo: targetUserId,
      assignedToName: `${targetUser.firstName} ${targetUser.lastName}`,
      strategy: 'manual',
    };
  }

  private async handleFallback(
    tenantId: string,
    leadId: string,
    leadData: { firstName: string; lastName: string; email?: string; source?: string },
    config: LeadDistributionConfigData,
    reason: string,
  ): Promise<DistributionResult | null> {
    if (config.fallbackBehavior === 'MANUAL_QUEUE') {
      this.logger.log(
        `Lead ${leadId} queued for manual assignment (reason: ${reason}) in tenant ${tenantId}`,
      );
      return null;
    }

    this.logger.log(
      `Lead ${leadId} left unassigned (reason: ${reason}, fallback: UNASSIGNED) in tenant ${tenantId}`,
    );
    return null;
  }

  async getEligibleUsers(tenantId: string, config?: LeadDistributionConfigData) {
    const distributionConfig = config || (await this.getConfig(tenantId));

    const where: any = {
      tenantId,
      status: 'ACTIVE',
      role: { in: ['admin', 'user'] },
    };

    if (distributionConfig.eligibleUserIds.length > 0) {
      where.id = { in: distributionConfig.eligibleUserIds };
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }
}
