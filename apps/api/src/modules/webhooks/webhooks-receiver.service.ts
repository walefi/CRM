import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../infrastructure/event-bus/event-bus.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import * as crypto from 'crypto';

export interface WebhookPayload {
  provider: string;
  event: string;
  externalId?: string;
  data: Record<string, unknown>;
  headers: Record<string, string>;
  rawBody: string;
  tenantId: string;
}

export interface WebhookNormalizer {
  normalize(payload: Record<string, unknown>): {
    event: string;
    externalId?: string;
    data: Record<string, unknown>;
  };
}

@Injectable()
export class WebhooksReceiverService {
  private readonly logger = new Logger(WebhooksReceiverService.name);
  private readonly normalizers: Map<string, WebhookNormalizer> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly encryptionService: EncryptionService,
  ) {}

  registerNormalizer(provider: string, normalizer: WebhookNormalizer): void {
    this.normalizers.set(provider, normalizer);
    this.logger.log(`Webhook normalizer registered for provider: ${provider}`);
  }

  async receiveWebhook(payload: WebhookPayload): Promise<{ accepted: boolean; reason?: string }> {
    const { provider, rawBody, headers, tenantId } = payload;

    const channel = await this.findChannel(provider, tenantId);
    if (!channel) {
      this.logger.warn(`No channel found for provider=${provider} tenant=${tenantId}`);
      return { accepted: false, reason: 'channel_not_found' };
    }

    if (!channel.isActive) {
      this.logger.warn(`Channel ${channel.id} is inactive for provider=${provider}`);
      return { accepted: false, reason: 'channel_inactive' };
    }

    if (channel.webhookSecret) {
      const secret = this.encryptionService.isAvailable() && this.isEncrypted(channel.webhookSecret)
        ? this.encryptionService.decrypt(channel.webhookSecret)
        : channel.webhookSecret;
      const isValid = this.verifySignature(rawBody, headers, secret, provider);
      if (!isValid) {
        this.logger.warn(`Invalid webhook signature for provider=${provider} tenant=${tenantId}`);
        return { accepted: false, reason: 'invalid_signature' };
      }
    }

    const parsedBody = JSON.parse(rawBody);
    const normalized = this.normalizePayload(provider, parsedBody);

    const idempotencyKey = this.buildIdempotencyKey(provider, normalized.externalId, normalized.event);
    const isDuplicate = await this.checkIdempotency(idempotencyKey, tenantId);
    if (isDuplicate) {
      this.logger.debug(`Duplicate webhook ignored: ${idempotencyKey}`);
      return { accepted: true, reason: 'duplicate' };
    }

    await this.logWebhookDelivery({
      provider,
      event: normalized.event,
      externalId: normalized.externalId,
      idempotencyKey,
      payload: parsedBody,
      status: 'received',
      tenantId,
    });

    await this.eventBus.publish(
      new (await import('../../infrastructure/event-bus/domain-events')).BaseDomainEvent({
        eventName: `webhook.${provider}.${normalized.event}`,
        aggregateType: 'Webhook',
        aggregateId: normalized.externalId,
        payload: { provider, event: normalized.event, data: normalized.data },
        tenantId,
        origin: `webhook-${provider}`,
      }),
    );

    this.logger.log(
      `Webhook accepted: provider=${provider} event=${normalized.event} idempotencyKey=${idempotencyKey}`,
    );

    return { accepted: true };
  }

  private async findChannel(provider: string, tenantId: string) {
    const channelType = this.mapProviderToChannelType(provider);
    return (this.prisma as any).channel.findFirst({
      where: { type: channelType, tenantId, isActive: true },
    });
  }

  private mapProviderToChannelType(provider: string): string {
    const mapping: Record<string, string> = {
      whatsapp: 'WHATSAPP',
      email: 'EMAIL',
      instagram: 'INSTAGRAM',
      facebook: 'FACEBOOK',
      sms: 'SMS',
      chat: 'CHAT',
    };
    return mapping[provider.toLowerCase()] || 'CHAT';
  }

  verifySignature(
    rawBody: string,
    headers: Record<string, string>,
    secret: string,
    provider: string,
  ): boolean {
    switch (provider.toLowerCase()) {
      case 'whatsapp': {
        const signature = headers['x-hub-signature-256'] || '';
        const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
        if (signature.length !== expected.length) return false;
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      }
      case 'stripe': {
        const sig = headers['stripe-signature'] || '';
        const parts = sig.split(',').reduce((acc: Record<string, string>, part: string) => {
          const [key, value] = part.split('=');
          if (key && value) acc[key.trim()] = value.trim();
          return acc;
        }, {});
        const timestamp = parts['t'];
        const expectedSig = parts['v1'];
        if (!timestamp || !expectedSig) return false;
        const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
        if (expectedSig.length !== expected.length) return false;
        return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(expected));
      }
      default: {
        const signature = headers['x-webhook-signature'] || headers['x-hub-signature'] || '';
        const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        if (signature.length !== expected.length) return false;
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      }
    }
  }

  private normalizePayload(
    provider: string,
    data: Record<string, unknown>,
  ): { event: string; externalId?: string; data: Record<string, unknown> } {
    const normalizer = this.normalizers.get(provider);
    if (normalizer) {
      return normalizer.normalize(data);
    }

    return {
      event: (data.event as string) || (data.type as string) || 'unknown',
      externalId: (data.id as string) || (data.external_id as string),
      data,
    };
  }

  private buildIdempotencyKey(provider: string, externalId?: string, event?: string): string {
    return `${provider}:${externalId || 'no-id'}:${event || 'unknown'}`;
  }

  private isEncrypted(value: string): boolean {
    try {
      const decoded = Buffer.from(value, 'base64');
      return decoded.length > 48;
    } catch {
      return false;
    }
  }

  private async checkIdempotency(idempotencyKey: string, tenantId: string): Promise<boolean> {
    const existing = await (this.prisma as any).webhookDelivery.findFirst({
      where: {
        idempotencyKey,
        tenantId,
        status: { not: 'failed' },
      },
    });
    return !!existing;
  }

  private async logWebhookDelivery(data: {
    provider: string;
    event: string;
    externalId?: string;
    idempotencyKey: string;
    payload: Record<string, unknown>;
    status: string;
    tenantId: string;
  }): Promise<void> {
    try {
      await (this.prisma as any).webhookDelivery.create({
        data: {
          endpointId: '',
          event: data.event,
          payload: data.payload as any,
          status: data.status,
          idempotencyKey: data.idempotencyKey,
          tenantId: data.tenantId,
        },
      });
    } catch (error: any) {
      this.logger.warn(`Failed to log webhook delivery: ${error.message}`);
    }
  }
}
