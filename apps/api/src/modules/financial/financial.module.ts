import { Module, Global } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';

@Global()
@Module({
  controllers: [FinancialController],
  providers: [FinancialService],
  exports: [FinancialService],
})
export class FinancialModule {}
