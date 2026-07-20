import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerDashboardService } from './customer-dashboard.service';
import { PortalAccessLogService } from './portal-access-log.service';

@Module({
  controllers: [PortalController],
  providers: [PortalService, CustomerAuthService, CustomerDashboardService, PortalAccessLogService],
  exports: [PortalService, CustomerAuthService, CustomerDashboardService, PortalAccessLogService],
})
export class PortalModule {}
