import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsInboundController } from './leads-inbound.controller';
import { LeadsService } from './leads.service';
import { LeadDistributionService } from './lead-distribution.service';
import { LeadDistributionConfigService } from './lead-distribution-config.service';
import { LeadDistributionConfigController } from './lead-distribution-config.controller';
import { LeadInboundApiKeyService } from './lead-inbound-api-key.service';
import { LeadInboundApiKeyController } from './lead-inbound-api-key.controller';
import { LeadInboundApiKeyGuard } from '../../common/guards/lead-inbound-api-key.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { EncryptionModule } from '../../infrastructure/encryption/encryption.module';

@Module({
  imports: [NotificationsModule, EncryptionModule],
  controllers: [
    LeadsController,
    LeadsInboundController,
    LeadDistributionConfigController,
    LeadInboundApiKeyController,
  ],
  providers: [
    LeadsService,
    LeadDistributionService,
    LeadDistributionConfigService,
    LeadInboundApiKeyService,
    LeadInboundApiKeyGuard,
  ],
  exports: [
    LeadsService,
    LeadDistributionService,
    LeadDistributionConfigService,
    LeadInboundApiKeyService,
  ],
})
export class LeadsModule {}
