import {
  Controller,
  Post,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { WebhooksReceiverService } from './webhooks-receiver.service';

@ApiTags('Webhooks')
@ApiExcludeController()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly receiverService: WebhooksReceiverService) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive webhook from provider' })
  async receive(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        headers[key.toLowerCase()] = value[0];
      }
    }

    const result = await this.receiverService.receiveWebhook({
      provider,
      event: (req.body?.event as string) || (req.body?.type as string) || 'unknown',
      externalId: req.body?.id as string,
      data: (req.body as Record<string, unknown>) || {},
      headers,
      rawBody,
      tenantId: headers['x-tenant-id'] || '',
    });

    if (!result.accepted) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: result.reason });
      return;
    }

    res.status(HttpStatus.OK).json({ received: true });
  }
}
