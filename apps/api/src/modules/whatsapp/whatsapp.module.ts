import { Module, Global } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppSendWorker } from './workers/whatsapp-send.worker';

@Global()
@Module({
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppSendWorker],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
