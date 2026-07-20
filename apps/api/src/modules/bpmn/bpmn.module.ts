import { Module, Global } from '@nestjs/common';
import { BpmnController } from './bpmn.controller';
import { BpmnService } from './bpmn.service';

@Global()
@Module({
  controllers: [BpmnController],
  providers: [BpmnService],
  exports: [BpmnService],
})
export class BpmnModule {}
