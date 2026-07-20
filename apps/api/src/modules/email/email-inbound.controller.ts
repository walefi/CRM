import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { EmailReceiverService } from './email-receiver.service';
import { IncomingEmailPayload } from './dto/incoming-email.dto';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Email Inbound')
@ApiExcludeController()
@Controller('webhooks')
export class EmailInboundController {
  private readonly logger = new Logger(EmailInboundController.name);

  constructor(
    private readonly receiverService: EmailReceiverService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive inbound email webhook' })
  async receiveInbound(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const body = req.body;
      const inboundEmail = this.normalizePayload(body);

      if (!inboundEmail.from.address) {
        res.status(HttpStatus.BAD_REQUEST).json({ error: 'missing_sender' });
        return;
      }

      const tenantId = await this.resolveTenantFromRecipient(inboundEmail);
      if (!tenantId) {
        this.logger.warn(`No tenant found for recipient: ${inboundEmail.to[0]?.address}`);
        res.status(HttpStatus.OK).json({ received: true, note: 'no_tenant' });
        return;
      }

      const result = await this.receiverService.receiveEmail(tenantId, inboundEmail);

      res.status(HttpStatus.OK).json({
        received: true,
        status: result.status,
        messageId: result.messageId,
      });
    } catch (error: any) {
      this.logger.error(`Inbound email processing failed: ${error.message}`, error.stack);
      res.status(HttpStatus.OK).json({ received: true, error: 'processing_failed' });
    }
  }

  @Post('email/sendgrid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive SendGrid Inbound Parse webhook' })
  async receiveSendGrid(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const body = req.body;
      const inboundEmail = this.normalizeSendGridPayload(body);

      const tenantId = await this.resolveTenantFromRecipient(inboundEmail);
      if (!tenantId) {
        res.status(HttpStatus.OK).json({ received: true });
        return;
      }

      const result = await this.receiverService.receiveEmail(tenantId, inboundEmail);
      res.status(HttpStatus.OK).json({ received: true, status: result.status });
    } catch (error: any) {
      this.logger.error(`SendGrid inbound failed: ${error.message}`);
      res.status(HttpStatus.OK).json({ received: true });
    }
  }

  @Post('email/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Resend inbound webhook' })
  async receiveResend(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const body = req.body;
      const inboundEmail = this.normalizeResendPayload(body);

      const tenantId = await this.resolveTenantFromRecipient(inboundEmail);
      if (!tenantId) {
        res.status(HttpStatus.OK).json({ received: true });
        return;
      }

      const result = await this.receiverService.receiveEmail(tenantId, inboundEmail);
      res.status(HttpStatus.OK).json({ received: true, status: result.status });
    } catch (error: any) {
      this.logger.error(`Resend inbound failed: ${error.message}`);
      res.status(HttpStatus.OK).json({ received: true });
    }
  }

  private async resolveTenantFromRecipient(email: IncomingEmailPayload): Promise<string | null> {
    const allRecipients = [
      ...email.to.map((r: { address: string }) => r.address.toLowerCase()),
      ...(email.cc?.map((r: { address: string }) => r.address.toLowerCase()) || []),
    ];

    for (const recipient of allRecipients) {
      const account = await this.prisma.emailAccount.findFirst({
        where: { email: recipient, isActive: true },
        select: { tenantId: true },
      });
      if (account) return account.tenantId;
    }

    return null;
  }

  private normalizePayload(body: Record<string, unknown>): IncomingEmailPayload {
    const from = body.from as { address: string; name?: string } || { address: body.fromEmail as string || '' };
    const to = this.parseRecipients(body.to);
    const cc = this.parseRecipients(body.cc);

    return {
      provider: 'generic',
      messageId: body.messageId as string || body['message-id'] as string || '',
      inReplyTo: body.inReplyTo as string || body['in-reply-to'] as string || undefined,
      references: this.parseReferences(body.references as string || body['references'] as string),
      from: { address: (from.address || from as unknown as string).toString().trim(), name: from.name },
      to,
      cc: cc.length > 0 ? cc : undefined,
      subject: (body.subject as string) || '(no subject)',
      textBody: body.text as string | undefined,
      htmlBody: body.html as string | undefined,
      receivedAt: body.date ? new Date(body.date as string) : new Date(),
      tenantId: '',
    };
  }

  private normalizeSendGridPayload(body: Record<string, unknown>): IncomingEmailPayload {
    return {
      provider: 'sendgrid',
      messageId: body['message-id'] as string || '',
      inReplyTo: body['in-reply-to'] as string || undefined,
      references: this.parseReferences(body.references as string),
      from: { address: body.from as string, name: '' },
      to: this.parseRecipients(body.to),
      subject: (body.subject as string) || '(no subject)',
      textBody: body.text as string | undefined,
      htmlBody: body.html as string | undefined,
      receivedAt: new Date(),
      tenantId: '',
    };
  }

  private normalizeResendPayload(body: Record<string, unknown>): IncomingEmailPayload {
    const data = (body.data || body) as Record<string, unknown>;
    return {
      provider: 'resend',
      messageId: data.message_id as string || data.id as string || '',
      inReplyTo: data.in_reply_to as string || undefined,
      references: this.parseReferences(data.references as string),
      from: { address: data.from as string, name: '' },
      to: this.parseRecipients(data.to),
      subject: (data.subject as string) || '(no subject)',
      textBody: data.text as string | undefined,
      htmlBody: data.html as string | undefined,
      receivedAt: data.created_at ? new Date(data.created_at as string) : new Date(),
      tenantId: '',
    };
  }

  private parseRecipients(value: unknown): Array<{ address: string; name?: string }> {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((r) => {
        if (typeof r === 'string') return { address: r };
        return { address: r.address || r.email || '', name: r.name };
      });
    }
    if (typeof value === 'string') {
      return value.split(',').map((r) => ({ address: r.trim() }));
    }
    return [];
  }

  private parseReferences(value: unknown): string[] | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') {
      const refs = value.split(/\s+/).filter(Boolean);
      return refs.length > 0 ? refs : undefined;
    }
    return undefined;
  }
}
