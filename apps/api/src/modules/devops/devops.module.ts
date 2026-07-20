import { Module, Global } from '@nestjs/common';
import { DevopsController } from './devops.controller';
import { DevopsService } from './devops.service';

@Global()
@Module({
  controllers: [DevopsController],
  providers: [DevopsService],
  exports: [DevopsService],
})
export class DevopsModule {}
