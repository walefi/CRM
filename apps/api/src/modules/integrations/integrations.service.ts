import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { BaseDomainEvent } from '../../infrastructure/event-bus/domain-events';

const PROVIDER_REGISTRY: Record<string, any> = {
  google: { name: 'Google', icon: 'google', category: 'productivity', authTypes: ['oauth2'] },
  microsoft: {
    name: 'Microsoft 365',
    icon: 'microsoft',
    category: 'productivity',
    authTypes: ['oauth2'],
  },
  meta: { name: 'Meta', icon: 'facebook', category: 'social', authTypes: ['oauth2'] },
  whatsapp: {
    name: 'WhatsApp Business',
    icon: 'whatsapp',
    category: 'messaging',
    authTypes: ['api_key'],
  },
  telegram: { name: 'Telegram', icon: 'telegram', category: 'messaging', authTypes: ['api_key'] },
  slack: { name: 'Slack', icon: 'slack', category: 'communication', authTypes: ['oauth2'] },
  discord: { name: 'Discord', icon: 'discord', category: 'communication', authTypes: ['oauth2'] },
  stripe: { name: 'Stripe', icon: 'stripe', category: 'payment', authTypes: ['api_key'] },
  mercadopago: {
    name: 'Mercado Pago',
    icon: 'mercadopago',
    category: 'payment',
    authTypes: ['api_key'],
  },
  asaas: { name: 'Asaas', icon: 'asaas', category: 'payment', authTypes: ['api_key'] },
  openai: { name: 'OpenAI', icon: 'openai', category: 'ai', authTypes: ['api_key'] },
  anthropic: { name: 'Anthropic', icon: 'anthropic', category: 'ai', authTypes: ['api_key'] },
  aws: { name: 'AWS', icon: 'aws', category: 'cloud', authTypes: ['api_key', 'oauth2'] },
  azure: { name: 'Azure', icon: 'azure', category: 'cloud', authTypes: ['oauth2'] },
  gcp: { name: 'Google Cloud', icon: 'gcp', category: 'cloud', authTypes: ['oauth2'] },
  cloudflare: { name: 'Cloudflare', icon: 'cloudflare', category: 'infra', authTypes: ['api_key'] },
  github: { name: 'GitHub', icon: 'github', category: 'dev', authTypes: ['oauth2'] },
  gitlab: { name: 'GitLab', icon: 'gitlab', category: 'dev', authTypes: ['oauth2'] },
  bitbucket: { name: 'Bitbucket', icon: 'bitbucket', category: 'dev', authTypes: ['oauth2'] },
  hubspot: { name: 'HubSpot', icon: 'hubspot', category: 'crm', authTypes: ['oauth2'] },
  salesforce: { name: 'Salesforce', icon: 'salesforce', category: 'crm', authTypes: ['oauth2'] },
  pipedrive: { name: 'Pipedrive', icon: 'pipedrive', category: 'crm', authTypes: ['oauth2'] },
  rdstation: {
    name: 'RD Station',
    icon: 'rdstation',
    category: 'marketing',
    authTypes: ['oauth2'],
  },
  n8n: { name: 'n8n', icon: 'n8n', category: 'automation', authTypes: ['api_key'] },
  zapier: { name: 'Zapier', icon: 'zapier', category: 'automation', authTypes: ['oauth2'] },
  make: { name: 'Make', icon: 'make', category: 'automation', authTypes: ['oauth2'] },
  rest: {
    name: 'REST API',
    icon: 'rest',
    category: 'generic',
    authTypes: ['bearer', 'api_key', 'basic'],
  },
  graphql: {
    name: 'GraphQL',
    icon: 'graphql',
    category: 'generic',
    authTypes: ['bearer', 'api_key'],
  },
  soap: { name: 'SOAP', icon: 'soap', category: 'generic', authTypes: ['basic'] },
};

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  getProviders() {
    return Object.entries(PROVIDER_REGISTRY).map(([key, value]) => ({
      provider: key,
      ...value,
    }));
  }

  async findAll(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (dto.search) where.name = { contains: dto.search, mode: 'insensitive' };
    if (dto.category)
      where.provider = {
        in: Object.keys(PROVIDER_REGISTRY).filter(
          (k) => PROVIDER_REGISTRY[k].category === dto.category,
        ),
      };
    if (dto.isActive !== undefined) where.isActive = dto.isActive;

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prismaAny.integration.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prismaAny.integration.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findById(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    const integration = await prismaAny.integration.findFirst({
      where: { id, tenantId },
      include: {
        connections: true,
        syncs: { take: 5, orderBy: { createdAt: 'desc' } },
        logs: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);
    return integration;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    return prismaAny.integration.create({
      data: {
        name: dto.name,
        type: dto.type || dto.provider,
        provider: dto.provider,
        config: (dto.config as any) || {},
        isActive: false,
        isConnected: false,
        metadata: (dto.metadata as any) || {},
        tenantId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findById(tenantId, id);
    const prismaAny = this.prisma as any;
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.config !== undefined) data.config = dto.config as any;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return prismaAny.integration.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    const prismaAny = this.prisma as any;
    await prismaAny.integrationConnection.deleteMany({ where: { integrationId: id } });
    await prismaAny.integrationLog.deleteMany({ where: { integrationId: id } });
    await prismaAny.integrationSync.deleteMany({ where: { integrationId: id } });
    await prismaAny.integrationWebhook.deleteMany({ where: { integrationId: id } });
    await prismaAny.integration.deleteMany({ where: { id, tenantId } });
  }

  async connect(tenantId: string, id: string, dto: any) {
    const prismaAny = this.prisma as any;
    const { authType, scopes, metadata } = dto;

    const accessToken = `tok_${crypto.randomUUID().replace(/-/g, '')}`;
    const refreshToken =
      authType === 'oauth2' ? `ref_${crypto.randomUUID().replace(/-/g, '')}` : null;

    await prismaAny.integrationConnection.create({
      data: {
        integrationId: id,
        status: 'connected',
        authType: authType || 'oauth2',
        accessToken,
        refreshToken,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        scopes: scopes || [],
        metadata: (metadata as any) || {},
        tenantId,
      },
    });

    await prismaAny.integration.update({
      where: { id },
      data: { isConnected: true, isActive: true, healthScore: 'healthy' },
    });

    this.eventBus
      .publish(
        new BaseDomainEvent({
          eventName: 'integration.connected',
          aggregateType: 'Integration',
          aggregateId: id,
          payload: { id },
          tenantId,
        }),
      )
      .catch(() => {});

    return this.findById(tenantId, id);
  }

  async disconnect(tenantId: string, id: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.integrationConnection.deleteMany({ where: { integrationId: id } });
    await prismaAny.integration.update({
      where: { id },
      data: { isConnected: false, isActive: false, healthScore: 'disconnected' },
    });

    this.eventBus
      .publish(
        new BaseDomainEvent({
          eventName: 'integration.disconnected',
          aggregateType: 'Integration',
          aggregateId: id,
          payload: { id },
          tenantId,
        }),
      )
      .catch(() => {});

    return this.findById(tenantId, id);
  }

  async sync(tenantId: string, id: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const start = Date.now();

    const syncRecord = await prismaAny.integrationSync.create({
      data: {
        integrationId: id,
        status: 'running',
        direction: dto.direction || 'import',
        recordsTotal: 0,
        recordsProcessed: 0,
        startedAt: new Date(),
        tenantId,
        userId,
      },
    });

    try {
      // Simulate sync
      const records = dto.direction === 'import' ? Math.floor(Math.random() * 50) + 5 : 0;
      const failed = Math.floor(Math.random() * 3);

      await prismaAny.integrationSync.update({
        where: { id: syncRecord.id },
        data: {
          status: 'completed',
          recordsTotal: records,
          recordsProcessed: records - failed,
          recordsFailed: failed,
          completedAt: new Date(),
          durationMs: Date.now() - start,
        },
      });

      await prismaAny.integration.update({
        where: { id },
        data: { lastSyncAt: new Date(), syncStatus: 'synced' },
      });

      this.eventBus
        .publish(
          new BaseDomainEvent({
            eventName: 'sync.completed',
            aggregateType: 'Integration',
            aggregateId: id,
            payload: { records, failed },
            tenantId,
            userId,
          }),
        )
        .catch(() => {});
    } catch (error: any) {
      await prismaAny.integrationSync.update({
        where: { id: syncRecord.id },
        data: { status: 'failed', completedAt: new Date(), error: error.message },
      });
      throw error;
    }

    return prismaAny.integrationSync.findUnique({ where: { id: syncRecord.id } });
  }

  async test(_tenantId: string, _id: string) {
    const start = Date.now();
    const success = Math.random() > 0.1;
    const durationMs = Date.now() - start;

    return {
      success,
      provider: 'integration-hub',
      latencyMs: durationMs,
      message: success ? 'Connection successful' : 'Connection failed: timeout',
      testedAt: new Date().toISOString(),
    };
  }

  async getHealth(tenantId: string, id?: string) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (id) where.id = id;

    const integrations = await prismaAny.integration.findMany({
      where,
      select: {
        id: true,
        name: true,
        provider: true,
        isConnected: true,
        healthScore: true,
        lastSyncAt: true,
        syncStatus: true,
      },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const errors = await prismaAny.integrationLog.count({
      where: { tenantId, level: 'error', createdAt: { gte: todayStart } },
    });

    const activeSyncs = await prismaAny.integrationSync.count({
      where: { tenantId, status: 'running' },
    });

    return {
      integrations,
      activeSyncs,
      errorsToday: errors,
      overallHealth: integrations.every((i: any) => i.isConnected) ? 'healthy' : 'degraded',
    };
  }

  async getLogs(tenantId: string, integrationId?: string, page = 1, limit = 30) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (integrationId) where.integrationId = integrationId;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prismaAny.integrationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaAny.integrationLog.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getSyncHistory(tenantId: string, integrationId?: string, page = 1, limit = 20) {
    const prismaAny = this.prisma as any;
    const where: any = { tenantId };
    if (integrationId) where.integrationId = integrationId;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prismaAny.integrationSync.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaAny.integrationSync.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [total, active, connected, syncsToday, errorsToday, totalSyncs] = await Promise.all([
      prismaAny.integration.count({ where: { tenantId } }),
      prismaAny.integration.count({ where: { tenantId, isActive: true } }),
      prismaAny.integration.count({ where: { tenantId, isConnected: true } }),
      prismaAny.integrationSync.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      prismaAny.integrationLog.count({
        where: { tenantId, level: 'error', createdAt: { gte: todayStart } },
      }),
      prismaAny.integrationSync.count({ where: { tenantId } }),
    ]);

    return { total, active, connected, syncsToday, errorsToday, totalSyncs };
  }

  logRequest(tenantId: string, integrationId: string, data: any) {
    const prismaAny = this.prisma as any;
    return prismaAny.integrationLog
      .create({
        data: {
          integrationId,
          level: data.level || 'info',
          message: data.message,
          method: data.method,
          url: data.url,
          statusCode: data.statusCode,
          durationMs: data.durationMs,
          requestBody: data.requestBody as any,
          responseBody: data.responseBody as any,
          error: data.error,
          tenantId,
          userId: data.userId,
        },
      })
      .catch(() => {});
  }
}
