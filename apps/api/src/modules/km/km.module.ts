import { Module, Global } from '@nestjs/common';
import { KmController } from './km.controller';
import { KmService } from './km.service';

@Global()
@Module({
  controllers: [KmController],
  providers: [KmService],
  exports: [KmService],
})
export class KmModule {}
