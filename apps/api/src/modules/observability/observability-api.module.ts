import { Module } from '@nestjs/common';
import { ObservabilityApiController } from './observability-api.controller';
import { ObservabilityApiService } from './observability-api.service';

@Module({
  controllers: [ObservabilityApiController],
  providers: [ObservabilityApiService],
  exports: [ObservabilityApiService],
})
export class ObservabilityApiModule {}
