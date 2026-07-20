import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateRequiredEnv } from './config/config.factory';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { json } from 'express';
import { APP_NAME, APP_VERSION, APP_DESCRIPTION } from './shared/constants/app.constants';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  validateRequiredEnv();

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 3001);
  const corsOriginRaw = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const corsOrigin = corsOriginRaw.includes(',')
    ? corsOriginRaw.split(',').map((o) => o.trim())
    : corsOriginRaw;

  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'same-origin' },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: process.env.NODE_ENV === 'production',
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    }),
  );

  app.use(
    compression({
      threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024', 10),
    }),
  );

  app.use(
    json({
      limit: process.env.MAX_PAYLOAD_SIZE || '10mb',
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Correlation-Id',
      'X-Tenant-Id',
      'X-Api-Key',
    ],
    exposedHeaders: ['X-Request-Id', 'X-Correlation-Id'],
    maxAge: 86400,
  });

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(APP_NAME)
    .setDescription(APP_DESCRIPTION)
    .setVersion(APP_VERSION)
    .setContact('CRM Enterprise Team', 'https://crm-enterprise.com', 'dev@crm-enterprise.com')
    .setLicense('Proprietary', 'https://crm-enterprise.com/license')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-tenant-id',
        in: 'header',
        description: 'Tenant identifier',
      },
      'tenant-id',
    )
    .addServer(`http://localhost:${port}`, 'Development')
    .addServer('https://api.crm-enterprise.com', 'Production')
    .addTag('Health', 'System health checks')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Tenants', 'Multi-tenant management')
    .addTag('Companies', 'Company records')
    .addTag('Contacts', 'Contact records')
    .addTag('Leads', 'Lead management')
    .addTag('Pipelines', 'Sales pipeline stages')
    .addTag('Deals', 'Deal management')
    .addTag('Tasks', 'Task management')
    .addTag('Notifications', 'Notification system')
    .addTag('Integrations', 'External integrations')
    .addTag('AI', 'AI-powered features')
    .addTag('Automations', 'Workflow automations')
    .addTag('Workflows', 'Workflow Engine & Builder')
    .addTag('Conversations', 'Omnichannel inbox & chat')
    .addTag('HelpDesk', 'Ticket support & knowledge base')
    .addTag('Portal', 'Customer self-service portal')
    .addTag('Timeline', 'Unified timeline 360°')
    .addTag('Documents', 'Enterprise document management')
    .addTag('Signatures', 'Electronic signature platform')
    .addTag('SalesOrders', 'Sales order management')
    .addTag('Inventory', 'Inventory & warehouse')
    .addTag('Procurement', 'Procurement & purchasing')
    .addTag('Financial', 'Financial management')
    .addTag('Billing', 'Billing, invoicing & fiscal')
    .addTag('CustomerSuccess', 'Customer success & subscriptions')
    .addTag('HR', 'HR & workforce management')
    .addTag('Assets', 'Asset & maintenance management')
    .addTag('Manufacturing', 'Manufacturing & production')
    .addTag('Quality', 'Quality management')
    .addTag('Logistics', 'Logistics & transportation')
    .addTag('ControlTower', 'Supply chain control tower')
    .addTag('BI', 'Business intelligence & data warehouse')
    .addTag('AI-ML', 'AI, ML & decision intelligence')
    .addTag('Gateway', 'API gateway & marketplace')
    .addTag('Security', 'Identity, security & compliance')
    .addTag('Observability', 'Observability & monitoring')
    .addTag('DevOps', 'DevSecOps & platform engineering')
    .addTag('BPMN', 'Workflow automation, BPMN & low-code')
    .addTag('Knowledge', 'Knowledge management & enterprise search')
    .addTag('Collaboration', 'Collaboration & productivity')
    .addTag('CX', 'Customer experience & contact center')
    .addTag('RevOps', 'Sales & revenue operations')
    .addTag('Search', 'Global search engine')
    .addTag('Analytics', 'Business intelligence & dashboards')
    .addTag('Reports', 'Report engine & exports')
    .addTag('Quotes', 'Commercial proposals')
    .addTag('Contracts', 'Contract management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    deepScanRoutes: true,
  });
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: `${APP_NAME} API Docs`,
  });

  await app.listen(port);

  logger.log(`🚀 ${APP_NAME} v${APP_VERSION} running on port ${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`💚 Health check: http://localhost:${port}/api/v1/health`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start application', error);
  process.exit(1);
});
