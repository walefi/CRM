import {
  Controller,
  Get,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AttachmentService } from './attachment.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@ApiTags('Email Attachments')
@ApiBearerAuth()
@Controller('email/attachments')
@UseGuards(JwtAuthGuard)
export class EmailAttachmentController {
  private readonly logger = new Logger(EmailAttachmentController.name);

  constructor(private readonly attachmentService: AttachmentService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Download email attachment by ID' })
  async download(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.attachmentService.getAttachment(tenantId, id);

      if (!result) {
        res.status(HttpStatus.NOT_FOUND).json({ error: 'attachment_not_found' });
        return;
      }

      const { record, data } = result;

      res.set({
        'Content-Type': record.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(record.filename)}"`,
        'Content-Length': data.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      });

      res.send(data);
    } catch (error: any) {
      this.logger.error(`Download failed: ${error.message}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'download_failed' });
    }
  }
}
