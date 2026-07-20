import { Module, Global } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailSendWorker } from './workers/email-send.worker';
import { EmailReceiverService } from './email-receiver.service';
import { EmailInboundController } from './email-inbound.controller';
import { ImapPollWorker } from './workers/imap-poll.worker';
import { AttachmentService } from './attachments/attachment.service';
import { EmailAttachmentController } from './attachments/attachment.controller';
import { StorageReconciliationService } from './attachments/storage-reconciliation.service';

@Global()
@Module({
  controllers: [EmailController, EmailInboundController, EmailAttachmentController],
  providers: [
    EmailService,
    EmailSendWorker,
    EmailReceiverService,
    ImapPollWorker,
    AttachmentService,
    StorageReconciliationService,
  ],
  exports: [EmailService, EmailReceiverService, AttachmentService, StorageReconciliationService],
})
export class EmailModule {}
