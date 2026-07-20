import { Module, Global } from '@nestjs/common';
import { ManufacturingController } from './manufacturing.controller';
import { ManufacturingService } from './manufacturing.service';

@Global()
@Module({
  controllers: [ManufacturingController],
  providers: [ManufacturingService],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
