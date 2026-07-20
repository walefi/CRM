import { Module, Global } from '@nestjs/common';
import { CustomerSuccessController } from './customer-success.controller';
import { CustomerSuccessService } from './customer-success.service';

@Global()
@Module({
  controllers: [CustomerSuccessController],
  providers: [CustomerSuccessService],
  exports: [CustomerSuccessService],
})
export class CustomerSuccessModule {}
