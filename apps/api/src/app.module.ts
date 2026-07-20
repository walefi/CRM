import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { EventBusModule } from './infrastructure/event-bus/event-bus.module';
import { EncryptionModule } from './infrastructure/encryption/encryption.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TeamsModule } from './modules/teams/teams.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CompanySettingsModule } from './modules/company-settings/company-settings.module';
import { CustomFieldsModule } from './modules/custom-fields/custom-fields.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { ProductsModule } from './modules/products/products.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { LeadsModule } from './modules/leads/leads.module';
import { PipelinesModule } from './modules/pipelines/pipelines.module';
import { DealsModule } from './modules/deals/deals.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AiModule } from './modules/ai/ai.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { EmailModule } from './modules/email/email.module';
import { HelpDeskModule } from './modules/tickets/help-desk.module';
import { PortalModule } from './modules/portal/portal.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { SalesOrdersModule } from './modules/sales-orders/sales-orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { FinancialModule } from './modules/financial/financial.module';
import { BillingModule } from './modules/billing/billing.module';
import { CustomerSuccessModule } from './modules/customer-success/customer-success.module';
import { HrModule } from './modules/hr/hr.module';
import { AssetsModule } from './modules/assets/assets.module';
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module';
import { QualityModule } from './modules/quality/quality.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { ControlTowerModule } from './modules/control-tower/control-tower.module';
import { BiModule } from './modules/bi/bi.module';
import { AiMlModule } from './modules/ai-ml/ai-ml.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { SecurityModule } from './modules/security/security.module';
import { ObservabilityApiModule } from './modules/observability/observability-api.module';
import { DevopsModule } from './modules/devops/devops.module';
import { BpmnModule } from './modules/bpmn/bpmn.module';
import { KmModule } from './modules/km/km.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { CxModule } from './modules/cx/cx.module';
import { RevopsModule } from './modules/revops/revops.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { SearchModule } from './modules/search/search.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReportsModule } from './modules/reports/reports.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { RequestContextMiddleware } from './common/middlewares/request-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('RATE_LIMIT_TTL', 60) * 1000,
            limit: config.get<number>('RATE_LIMIT_MAX', 100),
          },
        ],
      }),
    }),
    CacheModule,
    QueueModule,
    EventBusModule,
    EncryptionModule,
    ObservabilityModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    TeamsModule,
    DepartmentsModule,
    RolesModule,
    PermissionsModule,
    CompaniesModule,
    CompanySettingsModule,
    CustomFieldsModule,
    CalendarModule,
    ProductsModule,
    ContactsModule,
    LeadsModule,
    PipelinesModule,
    DealsModule,
    TasksModule,
    NotificationsModule,
    IntegrationsModule,
    AiModule,
    ConversationsModule,
    EmailModule,
    HelpDeskModule,
    PortalModule,
    TimelineModule,
    DocumentsModule,
    SignaturesModule,
    SalesOrdersModule,
    InventoryModule,
    ProcurementModule,
    FinancialModule,
    BillingModule,
    CustomerSuccessModule,
    HrModule,
    AssetsModule,
    ManufacturingModule,
    QualityModule,
    LogisticsModule,
    ControlTowerModule,
    BiModule,
    AiMlModule,
    GatewayModule,
    SecurityModule,
    ObservabilityApiModule,
    DevopsModule,
    BpmnModule,
    KmModule,
    CollaborationModule,
    CxModule,
    RevopsModule,
    AutomationsModule,
    WorkflowsModule,
    QuotesModule,
    ContractsModule,
    SearchModule,
    AnalyticsModule,
    ReportsModule,
    WebhooksModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
