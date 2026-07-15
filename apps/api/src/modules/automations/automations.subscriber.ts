import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AutomationsService } from './automations.service';
import { IDomainEvent } from '../../infrastructure/event-bus/domain-events';

@Injectable()
export class AutomationSubscriber {
  private readonly logger = new Logger(AutomationSubscriber.name);

  constructor(
    private readonly automationsService: AutomationsService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('lead.created')
  async onLeadCreated(event: IDomainEvent) {
    await this.handleEvent(event, 'LEAD_CREATED');
  }

  @OnEvent('lead.updated')
  async onLeadUpdated(event: IDomainEvent) {
    await this.handleEvent(event, 'LEAD_UPDATED');
  }

  @OnEvent('lead.converted')
  async onLeadConverted(event: IDomainEvent) {
    await this.handleEvent(event, 'LEAD_CONVERTED');
  }

  @OnEvent('contact.created')
  async onContactCreated(event: IDomainEvent) {
    await this.handleEvent(event, 'CONTACT_CREATED');
  }

  @OnEvent('company.created')
  async onCompanyCreated(event: IDomainEvent) {
    await this.handleEvent(event, 'COMPANY_CREATED');
  }

  @OnEvent('deal.created')
  async onDealCreated(event: IDomainEvent) {
    await this.handleEvent(event, 'DEAL_CREATED');
  }

  @OnEvent('deal.updated')
  async onDealUpdated(event: IDomainEvent) {
    await this.handleEvent(event, 'DEAL_UPDATED');
  }

  @OnEvent('deal.won')
  async onDealWon(event: IDomainEvent) {
    await this.handleEvent(event, 'DEAL_WON');
  }

  @OnEvent('deal.lost')
  async onDealLost(event: IDomainEvent) {
    await this.handleEvent(event, 'DEAL_LOST');
  }

  @OnEvent('contract.signed')
  async onContractSigned(event: IDomainEvent) {
    await this.handleEvent(event, 'CONTRACT_SIGNED');
  }

  @OnEvent('contract.created')
  async onContractCreated(event: IDomainEvent) {
    await this.handleEvent(event, 'CONTRACT_CREATED');
  }

  @OnEvent('contract.expiring')
  async onContractExpiring(event: IDomainEvent) {
    await this.handleEvent(event, 'CONTRACT_EXPIRING');
  }

  @OnEvent('contract.renewed')
  async onContractRenewed(event: IDomainEvent) {
    await this.handleEvent(event, 'CONTRACT_RENEWED');
  }

  @OnEvent('activity.created')
  async onActivityCreated(event: IDomainEvent) {
    await this.handleEvent(event, 'ACTIVITY_CREATED');
  }

  @OnEvent('activity.completed')
  async onActivityCompleted(event: IDomainEvent) {
    await this.handleEvent(event, 'ACTIVITY_COMPLETED');
  }

  @OnEvent('task.completed')
  async onTaskCompleted(event: IDomainEvent) {
    await this.handleEvent(event, 'TASK_COMPLETED');
  }

  @OnEvent('user.created')
  async onUserCreated(event: IDomainEvent) {
    await this.handleEvent(event, 'USER_CREATED');
  }

  @OnEvent('product.created')
  async onProductCreated(event: IDomainEvent) {
    await this.handleEvent(event, 'PRODUCT_CREATED');
  }

  @OnEvent('form.submitted')
  async onFormSubmitted(event: IDomainEvent) {
    await this.handleEvent(event, 'FORM_SUBMITTED');
  }

  @OnEvent('notification.sent')
  async onNotificationSent(event: IDomainEvent) {
    await this.handleEvent(event, 'NOTIFICATION_SENT');
  }

  @OnEvent('workflow.completed')
  async onWorkflowCompleted(event: IDomainEvent) {
    await this.handleEvent(event, 'WORKFLOW_COMPLETED');
  }

  @OnEvent('document.sent')
  async onDocumentSent(event: IDomainEvent) {
    await this.handleEvent(event, 'DOCUMENT_SENT');
  }

  @OnEvent('document.shared')
  async onDocumentShared(event: IDomainEvent) {
    await this.handleEvent(event, 'DOCUMENT_SHARED');
  }

  @OnEvent('quote.sent')
  async onQuoteSent(event: IDomainEvent) {
    await this.handleEvent(event, 'QUOTE_SENT');
  }

  @OnEvent('quote.accepted')
  async onQuoteAccepted(event: IDomainEvent) {
    await this.handleEvent(event, 'QUOTE_ACCEPTED');
  }

  @OnEvent('webhook.received')
  async onWebhookReceived(event: IDomainEvent) {
    await this.handleEvent(event, 'WEBHOOK_RECEIVED');
  }

  @OnEvent('custom.event')
  async onCustomEvent(event: IDomainEvent) {
    await this.handleEvent(event, 'CUSTOM_EVENT');
  }

  private async handleEvent(event: IDomainEvent, triggerType: string) {
    try {
      const tenantId = event.tenantId;
      const prismaAny = this.prisma as any;

      const automations = await prismaAny.automation.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          deletedAt: null,
          triggers: {
            some: {
              type: triggerType,
              isEnabled: true,
            },
          },
        },
        include: {
          triggers: true,
          conditions: { orderBy: { sortOrder: 'asc' } },
          actions: { orderBy: { sortOrder: 'asc' } },
          schedules: true,
          variables: true,
        },
      });

      if (automations.length === 0) {
        return;
      }

      this.logger.log(
        `Event "${event.eventName}" matched ${automations.length} automation(s) for tenant ${tenantId}`,
      );

      for (const automation of automations) {
        try {
          await this.automationsService.run(automation.id, tenantId, event.userId || 'system', {
            trigger: triggerType,
            input: event.payload,
          });
        } catch (error: any) {
          this.logger.error(
            `Automation "${automation.name}" (${automation.id}) failed during event "${event.eventName}": ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling event "${event.eventName}" for automations: ${error.message}`,
        error.stack,
      );
    }
  }
}
