import { Module, Global } from '@nestjs/common';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { TimelineSubscriber } from './timeline.subscriber';

@Global()
@Module({
  controllers: [TimelineController],
  providers: [TimelineService, TimelineSubscriber],
  exports: [TimelineService],
})
export class TimelineModule {}
