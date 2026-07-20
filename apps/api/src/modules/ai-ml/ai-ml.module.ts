import { Module, Global } from '@nestjs/common';
import { AiMlController } from './ai-ml.controller';
import { AiMlService } from './ai-ml.service';

@Global()
@Module({
  controllers: [AiMlController],
  providers: [AiMlService],
  exports: [AiMlService],
})
export class AiMlModule {}
