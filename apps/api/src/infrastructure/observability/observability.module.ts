import { Module } from '@nestjs/common';
import { AppLogger } from './logging/app-logger.service';
import { MetricsService } from './metrics/metrics.service';
import { TracingService } from './tracing/tracing.service';

@Module({
  providers: [AppLogger, MetricsService, TracingService],
  exports: [AppLogger, MetricsService, TracingService],
})
export class ObservabilityModule {}
