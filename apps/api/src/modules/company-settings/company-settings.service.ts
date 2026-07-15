import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TestEmailDto } from './dto/settings.dto';
import * as fs from 'fs';
import * as path from 'path';
import { Prisma } from '@prisma/client';

@Injectable()
export class CompanySettingsService {
  private readonly logger = new Logger(CompanySettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const settings = (tenant.settings as Record<string, unknown>) || {};
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      logo: tenant.logo,
      plan: tenant.plan,
      status: tenant.status,
      general: settings.general || {},
      branding: settings.branding || {},
      regional: settings.regional || {},
      smtp: settings.smtp || {},
      notifications: settings.notifications || {},
      security: settings.security || {},
      files: settings.files || {},
    };
  }

  async updateSettings(tenantId: string, section: string, data: unknown) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const currentSettings = (tenant.settings as Record<string, unknown>) || {};
    const updated = {
      ...currentSettings,
      [section]: {
        ...((currentSettings[section] as Record<string, unknown>) || {}),
        ...(data as Record<string, unknown>),
      },
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updated as Prisma.InputJsonValue },
    });

    await this.audit(tenantId, `SETTINGS_UPDATE_${section.toUpperCase()}`);

    this.logger.log(`Settings [${section}] updated for tenant ${tenantId}`);

    return { [section]: updated[section] };
  }

  async updateLogo(tenantId: string, file: any) {
    if (!file) throw new BadRequestException('No file provided');

    const uploadsDir = path.join(process.cwd(), '..', '..', 'uploads', 'logos');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = path.extname(file.originalname);
    const filename = `logo-${tenantId}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    const logoUrl = `/uploads/logos/${filename}`;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { logo: logoUrl },
    });

    await this.audit(tenantId, 'LOGO_UPLOADED');

    return { logo: logoUrl };
  }

  async deleteLogo(tenantId: string) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { logo: null },
    });

    const uploadsDir = path.join(process.cwd(), '..', '..', 'uploads', 'logos');
    const files = ['png', 'jpg', 'jpeg', 'svg', 'webp'].map((ext) =>
      path.join(uploadsDir, `logo-${tenantId}.${ext}`),
    );
    files.forEach((f) => {
      try {
        fs.unlinkSync(f);
      } catch {
        /* file may not exist */
      }
    });

    await this.audit(tenantId, 'LOGO_DELETED');
  }

  async uploadFavicon(tenantId: string, file: any) {
    if (!file) throw new BadRequestException('No file provided');

    const settings = await this.getSettings(tenantId);
    const branding = (settings.branding || {}) as Record<string, unknown>;

    const uploadsDir = path.join(process.cwd(), '..', '..', 'uploads', 'favicons');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = path.extname(file.originalname);
    const filename = `favicon-${tenantId}${ext}`;
    fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);

    const faviconUrl = `/uploads/favicons/${filename}`;

    await this.updateSettings(tenantId, 'branding', { ...branding, favicon: faviconUrl });

    return { favicon: faviconUrl };
  }

  async deleteFavicon(tenantId: string) {
    const settings = await this.getSettings(tenantId);
    const branding = (settings.branding || {}) as Record<string, unknown>;
    await this.updateSettings(tenantId, 'branding', { ...branding, favicon: null });
  }

  async testEmail(tenantId: string, dto: TestEmailDto) {
    const settings = await this.getSettings(tenantId);
    const smtp = settings.smtp as Record<string, unknown>;

    if (!smtp?.smtpHost || !smtp?.smtpUser) {
      throw new BadRequestException('SMTP not configured');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtp.smtpHost,
        port: smtp.smtpPort || 587,
        secure: smtp.smtpPort === 465,
        auth: { user: smtp.smtpUser, pass: smtp.smtpPassword },
      });

      await transporter.sendMail({
        from: `"${smtp.senderName || 'CRM'}" <${smtp.senderEmail || smtp.smtpUser}>`,
        to: dto.recipient,
        subject: 'CRM - Teste de configuração SMTP',
        text: 'Este é um email de teste do CRM Enterprise. Se você recebeu este email, a configuração SMTP está funcionando corretamente.',
      });

      this.logger.log(`SMTP test email sent to ${dto.recipient}`);
      return { success: true, message: 'Test email sent successfully' };
    } catch (error) {
      this.logger.error('SMTP test failed', error);
      throw new BadRequestException(`SMTP test failed: ${(error as Error).message}`);
    }
  }

  private async audit(tenantId: string, action: string) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          entity: 'settings',
          tenantId,
          metadata: { timestamp: new Date().toISOString() },
        },
      });
    } catch (error) {
      this.logger.error('Audit log failed', error);
    }
  }
}
