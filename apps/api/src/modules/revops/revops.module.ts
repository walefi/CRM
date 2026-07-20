import { Module, Global } from '@nestjs/common';
import { RevopsController } from './revops.controller';
import { RevopsService } from './revops.service';

@Global()
@Module({
  controllers: [RevopsController],
  providers: [RevopsService],
  exports: [RevopsService],
})
export class RevopsModule {}
