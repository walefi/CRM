import { Module, Global } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { KnowledgeController } from './knowledge.controller';
import { HelpDeskService } from './help-desk.service';

@Global()
@Module({
  controllers: [TicketsController, KnowledgeController],
  providers: [HelpDeskService],
  exports: [HelpDeskService],
})
export class HelpDeskModule {}
