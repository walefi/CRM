import { Module } from '@nestjs/common';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationSubscriber } from './automations.subscriber';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [WorkflowsModule],
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationSubscriber],
  exports: [AutomationsService],
})
export class AutomationsModule {}
