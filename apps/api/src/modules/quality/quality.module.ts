import { Module, Global } from '@nestjs/common';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';

@Global()
@Module({
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}
