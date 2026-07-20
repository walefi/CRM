import { Module, Global } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksReceiverService } from './webhooks-receiver.service';

@Global()
@Module({
  controllers: [WebhooksController],
  providers: [WebhooksReceiverService],
  exports: [WebhooksReceiverService],
})
export class WebhooksModule {}
