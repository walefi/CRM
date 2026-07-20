import { Module, Global } from '@nestjs/common';
import { ControlTowerController } from './control-tower.controller';
import { ControlTowerService } from './control-tower.service';

@Global()
@Module({
  controllers: [ControlTowerController],
  providers: [ControlTowerService],
  exports: [ControlTowerService],
})
export class ControlTowerModule {}
