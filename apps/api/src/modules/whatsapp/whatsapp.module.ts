import { Module, Global } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { WhatsAppSyncService } from './whatsapp-sync.service';
import { WhatsAppSendWorker } from './workers/whatsapp-send.worker';

@Global()
@Module({
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppTemplateService, WhatsAppSyncService, WhatsAppSendWorker],
  exports: [WhatsAppService, WhatsAppTemplateService, WhatsAppSyncService],
})
export class WhatsAppModule {}
