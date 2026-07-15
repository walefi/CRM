import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SearchService } from './search.service';
import { IDomainEvent } from '../../infrastructure/event-bus/domain-events';

@Injectable()
export class SearchSubscriber {
  private readonly logger = new Logger(SearchSubscriber.name);

  constructor(private readonly searchService: SearchService) {}

  @OnEvent('lead.created')
  async onLeadCreated(event: IDomainEvent) {
    await this.indexEntity(event, 'lead');
  }

  @OnEvent('lead.updated')
  async onLeadUpdated(event: IDomainEvent) {
    await this.indexEntity(event, 'lead');
  }

  @OnEvent('contact.created')
  async onContactCreated(event: IDomainEvent) {
    await this.indexEntity(event, 'contact');
  }

  @OnEvent('company.created')
  async onCompanyCreated(event: IDomainEvent) {
    await this.indexEntity(event, 'company');
  }

  @OnEvent('deal.created')
  async onDealCreated(event: IDomainEvent) {
    await this.indexEntity(event, 'deal');
  }

  @OnEvent('deal.updated')
  async onDealUpdated(event: IDomainEvent) {
    await this.indexEntity(event, 'deal');
  }

  @OnEvent('deal.won')
  async onDealWon(event: IDomainEvent) {
    await this.indexEntity(event, 'deal');
  }

  @OnEvent('deal.lost')
  async onDealLost(event: IDomainEvent) {
    await this.indexEntity(event, 'deal');
  }

  @OnEvent('product.created')
  async onProductCreated(event: IDomainEvent) {
    await this.indexEntity(event, 'product');
  }

  @OnEvent('quote.created')
  async onQuoteCreated(event: IDomainEvent) {
    await this.indexEntity(event, 'quote');
  }

  @OnEvent('contract.created')
  async onContractCreated(event: IDomainEvent) {
    await this.indexEntity(event, 'contract');
  }

  @OnEvent('contract.signed')
  async onContractSigned(event: IDomainEvent) {
    await this.indexEntity(event, 'contract');
  }

  @OnEvent('activity.created')
  async onActivityCreated(event: IDomainEvent) {
    await this.indexEntity(event, 'activity');
  }

  @OnEvent('task.completed')
  async onTaskCompleted(event: IDomainEvent) {
    await this.indexEntity(event, 'task');
  }

  @OnEvent('comment.created')
  async onCommentCreated(event: IDomainEvent) {
    await this.indexEntity(event, 'comment');
  }

  @OnEvent('tag.created')
  async onTagCreated(event: IDomainEvent) {
    await this.indexEntity(event, 'tag');
  }

  @OnEvent('document.sent')
  async onDocumentSent(event: IDomainEvent) {
    await this.indexEntity(event, 'document');
  }

  @OnEvent('workflow.completed')
  async onWorkflowCompleted(event: IDomainEvent) {
    await this.indexEntity(event, 'workflow');
  }

  @OnEvent('automation.execution.completed')
  async onAutomationExecuted(event: IDomainEvent) {
    await this.indexEntity(event, 'automation');
  }

  @OnEvent('notification.sent')
  async onNotificationSent(event: IDomainEvent) {
    await this.indexEntity(event, 'notification');
  }

  @OnEvent('user.created')
  async onUserCreated(event: IDomainEvent) {
    await this.indexEntity(event, 'user');
  }

  private async indexEntity(event: IDomainEvent, entityType: string) {
    try {
      const aggregateId = event.aggregateId || (event.payload as any)?.id;
      if (!aggregateId || !event.tenantId) return;

      const title =
        (event.payload as any)?.title ||
        (event.payload as any)?.name ||
        `${(event.payload as any)?.firstName || ''} ${(event.payload as any)?.lastName || ''}`.trim() ||
        `${entityType}-${aggregateId}`;

      await this.searchService.index(event.tenantId, {
        entityType,
        entityId: aggregateId,
        title,
        subtitle: (event.payload as any)?.email || (event.payload as any)?.description || undefined,
        content: JSON.stringify(event.payload),
        tags: (event.payload as any)?.tags || [],
        metadata: event.payload,
        url: `/${entityType}s`,
      });

      this.logger.debug(`Auto-indexed ${entityType}/${aggregateId} from event ${event.eventName}`);
    } catch (error: any) {
      this.logger.warn(
        `Failed to auto-index ${entityType} from event ${event.eventName}: ${error.message}`,
      );
    }
  }
}
