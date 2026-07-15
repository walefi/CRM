import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowsService } from './workflows.service';

@Injectable()
export class WorkflowSubscriber {
  private readonly logger = new Logger(WorkflowSubscriber.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  @OnEvent('lead.created')
  async onLeadCreated(event: any) {
    await this.executeMatchingWorkflows(event.tenantId, 'lead.created', event.payload);
  }

  @OnEvent('contact.created')
  async onContactCreated(event: any) {
    await this.executeMatchingWorkflows(event.tenantId, 'contact.created', event.payload);
  }

  @OnEvent('company.created')
  async onCompanyCreated(event: any) {
    await this.executeMatchingWorkflows(event.tenantId, 'company.created', event.payload);
  }

  @OnEvent('deal.created')
  async onDealCreated(event: any) {
    await this.executeMatchingWorkflows(event.tenantId, 'deal.created', event.payload);
  }

  @OnEvent('deal.won')
  async onDealWon(event: any) {
    await this.executeMatchingWorkflows(event.tenantId, 'deal.won', event.payload);
  }

  @OnEvent('deal.lost')
  async onDealLost(event: any) {
    await this.executeMatchingWorkflows(event.tenantId, 'deal.lost', event.payload);
  }

  @OnEvent('lead.converted')
  async onLeadConverted(event: any) {
    await this.executeMatchingWorkflows(event.tenantId, 'lead.converted', event.payload);
  }

  @OnEvent('contract.signed')
  async onContractSigned(event: any) {
    await this.executeMatchingWorkflows(event.tenantId, 'contract.signed', event.payload);
  }

  @OnEvent('activity.created')
  async onActivityCreated(event: any) {
    await this.executeMatchingWorkflows(event.tenantId, 'activity.created', event.payload);
  }

  @OnEvent('user.created')
  async onUserCreated(event: any) {
    await this.executeMatchingWorkflows(event.tenantId, 'user.created', event.payload);
  }

  @OnEvent('task.completed')
  async onTaskCompleted(event: any) {
    await this.executeMatchingWorkflows(event.tenantId, 'task.completed', event.payload);
  }

  private async executeMatchingWorkflows(tenantId: string, trigger: string, payload: any) {
    try {
      const workflows = await this.prisma.workflow.findMany({
        where: { tenantId, status: 'PUBLISHED', deletedAt: null },
      });

      for (const workflow of workflows) {
        const nodes = (workflow.nodes as any[]) || [];
        const hasMatchingTrigger = nodes.some(
          (n: any) => n.type === 'TRIGGER' && n.config?.triggerType === trigger,
        );

        if (hasMatchingTrigger) {
          await this.workflowsService
            .run(workflow.id, tenantId, 'system', {
              trigger,
              input: payload,
            })
            .catch((err: Error) => {
              this.logger.error(`Workflow ${workflow.id} failed for ${trigger}: ${err.message}`);
            });
        }
      }
    } catch (err: any) {
      this.logger.error(`Error executing workflows for ${trigger}: ${err.message}`);
    }
  }
}
