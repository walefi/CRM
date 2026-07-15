import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AnalyticsService } from './analytics.service';
import { IDomainEvent } from '../../infrastructure/event-bus/domain-events';

@Injectable()
export class AnalyticsSubscriber {
  private readonly logger = new Logger(AnalyticsSubscriber.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @OnEvent('lead.created')
  async onLeadCreated(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('lead.updated')
  async onLeadUpdated(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('lead.converted')
  async onLeadConverted(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('contact.created')
  async onContactCreated(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('company.created')
  async onCompanyCreated(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('deal.created')
  async onDealCreated(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('deal.won')
  async onDealWon(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('deal.lost')
  async onDealLost(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('product.created')
  async onProductCreated(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('quote.created')
  async onQuoteCreated(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('quote.accepted')
  async onQuoteAccepted(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('contract.created')
  async onContractCreated(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('contract.signed')
  async onContractSigned(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('activity.created')
  async onActivityCreated(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('activity.completed')
  async onActivityCompleted(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('document.sent')
  async onDocumentSent(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('workflow.completed')
  async onWorkflowCompleted(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('automation.execution.completed')
  async onAutomationExecuted(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('notification.sent')
  async onNotificationSent(event: IDomainEvent) {
    await this.collect(event);
  }

  @OnEvent('search.executed')
  async onSearchExecuted(event: IDomainEvent) {
    await this.collect(event);
  }

  private async collect(event: IDomainEvent) {
    try {
      await this.analyticsService.collectEvent(event);
    } catch (error: any) {
      this.logger.warn(`Analytics subscriber error: ${error.message}`);
    }
  }
}
