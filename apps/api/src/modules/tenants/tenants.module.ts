import { Module, Global } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantContext } from './tenant-context.service';

@Global()
@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantContext],
  exports: [TenantsService, TenantContext],
})
export class TenantsModule {}
