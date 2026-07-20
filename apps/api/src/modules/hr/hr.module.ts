import { Module, Global } from '@nestjs/common';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';

@Global()
@Module({
  controllers: [HrController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
