import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GatewayService {
  constructor(private readonly prisma: PrismaService) {}

  async getApplications(tenantId: string) {
    return (this.prisma as any).apiApplication.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createApplication(tenantId: string, userId: string, dto: any) {
    const clientId = `app_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const clientSecret = `secret_${crypto.randomUUID().replace(/-/g, '')}`;
    return (this.prisma as any).apiApplication.create({
      data: { name: dto.name, description: dto.description, clientId, clientSecret, scopes: dto.scopes || ['read'], redirectUri: dto.redirectUri, rateLimit: dto.rateLimit || 100, tenantId, createdBy: userId },
    });
  }

  async getConnectors(tenantId: string) {
    return (this.prisma as any).connector.findMany({ where: { tenantId }, orderBy: { category: 'asc' } });
  }

  async installConnector(tenantId: string, dto: any) {
    return (this.prisma as any).connector.upsert({
      where: { id: dto.connectorId || 'new' },
      create: { name: dto.name, type: dto.type || 'rest', category: dto.category || 'crm', version: dto.version || '1.0.0', description: dto.description, config: (dto.config as any) || {}, status: 'installed', installedAt: new Date(), tenantId },
      update: { config: (dto.config as any) || {}, status: 'installed', installedAt: new Date() },
    });
  }

  async getPlugins(tenantId: string) {
    return (this.prisma as any).plugin.findMany({ where: { tenantId }, orderBy: { category: 'asc' } });
  }

  async installPlugin(tenantId: string, dto: any) {
    return (this.prisma as any).plugin.upsert({
      where: { id: dto.pluginId || 'new' },
      create: { name: dto.name, category: dto.category || 'utility', version: dto.version || '1.0.0', description: dto.description, author: dto.author, permissions: dto.permissions || [], config: (dto.config as any) || {}, status: 'installed', installedAt: new Date(), tenantId },
      update: { config: (dto.config as any) || {}, status: 'installed', installedAt: new Date() },
    });
  }

  async getMarketplace(tenantId: string, category?: string) {
    const where: any = { tenantId, status: 'available' };
    if (category) where.category = category;
    const [connectors, plugins] = await Promise.all([
      (this.prisma as any).connector.findMany({ where, orderBy: { category: 'asc' } }),
      (this.prisma as any).plugin.findMany({ where, orderBy: { category: 'asc' } }),
    ]);
    return { connectors, plugins };
  }

  async getWebhooks(tenantId: string) {
    return (this.prisma as any).webhookEndpoint.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createWebhook(tenantId: string, dto: any) {
    return (this.prisma as any).webhookEndpoint.create({
      data: { name: dto.name, url: dto.url, secret: dto.secret, events: dto.events || [], retries: dto.retries || 3, tenantId },
    });
  }

  async simulateWebhookDelivery(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const endpoint = await prismaAny.webhookEndpoint.findFirst({ where: { id: dto.endpointId, tenantId } });
    if (!endpoint) {
      throw new Error('Webhook endpoint not found');
    }

    await prismaAny.webhookEndpoint.update({
      where: { id: dto.endpointId }, data: { lastAttemptAt: new Date(), lastStatus: 'pending' },
    });
    await prismaAny.webhookDelivery.create({
      data: { endpointId: dto.endpointId, event: dto.event || 'test', payload: (dto.payload as any) || {}, status: 'pending', statusCode: null, attemptCount: 1, tenantId },
    });
    return { endpointId: dto.endpointId, success: false, message: 'Webhook delivery recorded. Actual delivery requires an HTTP client configuration.' };
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [apps, connectors, plugins, webhooks] = await Promise.all([
      prismaAny.apiApplication.count({ where: { tenantId } }),
      prismaAny.connector.count({ where: { tenantId } }),
      prismaAny.plugin.count({ where: { tenantId } }),
      prismaAny.webhookEndpoint.count({ where: { tenantId } }),
    ]);
    return { apiApps: apps, connectors, plugins, webhooks };
  }
}
