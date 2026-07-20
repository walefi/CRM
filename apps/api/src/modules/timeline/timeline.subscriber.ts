import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TimelineService } from './timeline.service';
import { IDomainEvent } from '../../infrastructure/event-bus/domain-events';

@Injectable()
export class TimelineSubscriber {
  private readonly logger = new Logger(TimelineSubscriber.name);

  constructor(private readonly timelineService: TimelineService) {}

  @OnEvent('lead.created')
  async onLeadCreated(e: IDomainEvent) {
    await this.record(e, 'lead', 'created');
  }
  @OnEvent('lead.converted')
  async onLeadConverted(e: IDomainEvent) {
    await this.record(e, 'lead', 'converted');
  }
  @OnEvent('lead.assigned')
  async onLeadAssigned(e: IDomainEvent) {
    await this.record(e, 'lead', 'assigned');
  }
  @OnEvent('lead.reassigned')
  async onLeadReassigned(e: IDomainEvent) {
    await this.record(e, 'lead', 'reassigned');
  }
  @OnEvent('lead.intake')
  async onLeadIntake(e: IDomainEvent) {
    await this.record(e, 'lead', 'intake');
  }
  @OnEvent('contact.created')
  async onContactCreated(e: IDomainEvent) {
    await this.record(e, 'contact', 'created');
  }
  @OnEvent('company.created')
  async onCompanyCreated(e: IDomainEvent) {
    await this.record(e, 'company', 'created');
  }
  @OnEvent('deal.created')
  async onDealCreated(e: IDomainEvent) {
    await this.record(e, 'deal', 'created');
  }
  @OnEvent('deal.won')
  async onDealWon(e: IDomainEvent) {
    await this.record(e, 'deal', 'won');
  }
  @OnEvent('deal.lost')
  async onDealLost(e: IDomainEvent) {
    await this.record(e, 'deal', 'lost');
  }
  @OnEvent('product.created')
  async onProductCreated(e: IDomainEvent) {
    await this.record(e, 'product', 'created');
  }
  @OnEvent('contract.created')
  async onContractCreated(e: IDomainEvent) {
    await this.record(e, 'contract', 'created');
  }
  @OnEvent('contract.signed')
  async onContractSigned(e: IDomainEvent) {
    await this.record(e, 'contract', 'signed');
  }
  @OnEvent('quote.created')
  async onQuoteCreated(e: IDomainEvent) {
    await this.record(e, 'quote', 'created');
  }
  @OnEvent('quote.accepted')
  async onQuoteAccepted(e: IDomainEvent) {
    await this.record(e, 'quote', 'accepted');
  }
  @OnEvent('activity.created')
  async onActivityCreated(e: IDomainEvent) {
    await this.record(e, 'activity', 'created');
  }
  @OnEvent('task.completed')
  async onTaskCompleted(e: IDomainEvent) {
    await this.record(e, 'task', 'completed');
  }
  @OnEvent('document.sent')
  async onDocumentSent(e: IDomainEvent) {
    await this.record(e, 'document', 'sent');
  }
  @OnEvent('workflow.completed')
  async onWorkflowCompleted(e: IDomainEvent) {
    await this.record(e, 'workflow', 'completed');
  }
  @OnEvent('automation.execution.completed')
  async onAutomationExecuted(e: IDomainEvent) {
    await this.record(e, 'automation', 'executed');
  }
  @OnEvent('notification.sent')
  async onNotificationSent(e: IDomainEvent) {
    await this.record(e, 'notification', 'sent');
  }
  @OnEvent('user.created')
  async onUserCreated(e: IDomainEvent) {
    await this.record(e, 'user', 'created');
  }
  @OnEvent('ticket.created')
  async onTicketCreated(e: IDomainEvent) {
    await this.record(e, 'ticket', 'created');
  }
  @OnEvent('message.created')
  async onMessageCreated(e: IDomainEvent) {
    await this.record(e, 'message', 'created');
  }
  @OnEvent('message.sent')
  async onMessageSent(e: IDomainEvent) {
    await this.record(e, 'message', 'sent');
  }
  @OnEvent('message.received')
  async onMessageReceived(e: IDomainEvent) {
    await this.record(e, 'message', 'received');
  }
  @OnEvent('message.delivered')
  async onMessageDelivered(e: IDomainEvent) {
    await this.record(e, 'message', 'delivered');
  }
  @OnEvent('message.failed')
  async onMessageFailed(e: IDomainEvent) {
    await this.record(e, 'message', 'failed');
  }
  @OnEvent('whatsapp.template')
  async onWhatsAppTemplate(e: IDomainEvent) {
    await this.record(e, 'whatsapp', 'template');
  }
  @OnEvent('whatsapp.session_update')
  async onWhatsAppSessionUpdate(e: IDomainEvent) {
    await this.record(e, 'whatsapp', 'session_update');
  }

  private async record(event: IDomainEvent, entity: string, action: string) {
    try {
      await this.timelineService.recordEvent(event.tenantId, {
        module: entity,
        action: `${entity}.${action}`,
        entity,
        entityId: event.aggregateId || '',
        eventType: action,
        summary: `${entity} ${action}`,
        payload: event.payload,
        userId: event.userId,
        correlationId: event.correlationId,
      });
    } catch (error: any) {
      this.logger.warn(`Timeline record failed: ${error.message}`);
    }
  }
}
