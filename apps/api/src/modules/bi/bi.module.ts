import { Module, Global } from '@nestjs/common';
import { BiController } from './bi.controller';
import { BiService } from './bi.service';

@Global()
@Module({
  controllers: [BiController],
  providers: [BiService],
  exports: [BiService],
})
export class BiModule {}
