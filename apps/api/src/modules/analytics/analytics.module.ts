import { Module, Global } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSubscriber } from './analytics.subscriber';

@Global()
@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsSubscriber],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
