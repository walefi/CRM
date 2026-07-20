import { Module, Global } from '@nestjs/common';
import { CxController } from './cx.controller';
import { CxService } from './cx.service';

@Global()
@Module({
  controllers: [CxController],
  providers: [CxService],
  exports: [CxService],
})
export class CxModule {}
