import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowSubscriber } from './workflows.subscriber';

@Module({
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowSubscriber],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
