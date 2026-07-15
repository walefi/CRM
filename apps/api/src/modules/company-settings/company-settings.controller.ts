import {
  Controller, Get, Patch, Post, Delete, Body, Req,
  UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Request } from 'express';
import { CompanySettingsService } from './company-settings.service';
import {
  CompanySettingsDto, SmtpSettingsDto, NotificationSettingsDto,
  SecuritySettingsDto, FileSettingsDto, TestEmailDto,
} from './dto/settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Company Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('company')
export class CompanySettingsController {
  constructor(private readonly settingsService: CompanySettingsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get all company settings' })
  getSettings(@CurrentUser('tenantId') tenantId: string) {
    return this.settingsService.getSettings(tenantId);
  }

  @Patch('settings/general')
  @Roles('admin')
  @ApiOperation({ summary: 'Update general settings (admin)' })
  updateGeneral(@CurrentUser('tenantId') tenantId: string, @Body() dto: CompanySettingsDto) {
    return this.settingsService.updateSettings(tenantId, 'general', dto);
  }

  @Patch('settings/branding')
  @Roles('admin')
  @ApiOperation({ summary: 'Update branding settings (admin)' })
  updateBranding(@CurrentUser('tenantId') tenantId: string, @Body() dto: CompanySettingsDto) {
    return this.settingsService.updateSettings(tenantId, 'branding', dto);
  }

  @Patch('settings/regional')
  @Roles('admin')
  @ApiOperation({ summary: 'Update regional settings (admin)' })
  updateRegional(@CurrentUser('tenantId') tenantId: string, @Body() dto: CompanySettingsDto) {
    return this.settingsService.updateSettings(tenantId, 'regional', dto);
  }

  @Patch('settings/smtp')
  @Roles('admin')
  @ApiOperation({ summary: 'Update SMTP settings (admin)' })
  updateSmtp(@CurrentUser('tenantId') tenantId: string, @Body() dto: SmtpSettingsDto) {
    return this.settingsService.updateSettings(tenantId, 'smtp', dto);
  }

  @Patch('settings/notifications')
  @Roles('admin')
  @ApiOperation({ summary: 'Update notification settings (admin)' })
  updateNotifications(@CurrentUser('tenantId') tenantId: string, @Body() dto: NotificationSettingsDto) {
    return this.settingsService.updateSettings(tenantId, 'notifications', dto);
  }

  @Patch('settings/security')
  @Roles('admin')
  @ApiOperation({ summary: 'Update security settings (admin)' })
  updateSecurity(@CurrentUser('tenantId') tenantId: string, @Body() dto: SecuritySettingsDto) {
    return this.settingsService.updateSettings(tenantId, 'security', dto);
  }

  @Patch('settings/files')
  @Roles('admin')
  @ApiOperation({ summary: 'Update file/upload settings (admin)' })
  updateFiles(@CurrentUser('tenantId') tenantId: string, @Body() dto: FileSettingsDto) {
    return this.settingsService.updateSettings(tenantId, 'files', dto);
  }

  @Post('logo')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload company logo (admin)' })
  @ApiConsumes('multipart/form-data')
  uploadLogo(@CurrentUser('tenantId') tenantId: string, @UploadedFile() file: any) {
    return this.settingsService.updateLogo(tenantId, file);
  }

  @Delete('logo')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete company logo (admin)' })
  deleteLogo(@CurrentUser('tenantId') tenantId: string) {
    return this.settingsService.deleteLogo(tenantId);
  }

  @Post('favicon')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload company favicon (admin)' })
  @ApiConsumes('multipart/form-data')
  uploadFavicon(@CurrentUser('tenantId') tenantId: string, @UploadedFile() file: any) {
    return this.settingsService.uploadFavicon(tenantId, file);
  }

  @Delete('favicon')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete company favicon (admin)' })
  deleteFavicon(@CurrentUser('tenantId') tenantId: string) {
    return this.settingsService.deleteFavicon(tenantId);
  }

  @Post('test-email')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test SMTP email connection (admin)' })
  testEmail(@CurrentUser('tenantId') tenantId: string, @Body() dto: TestEmailDto) {
    return this.settingsService.testEmail(tenantId, dto);
  }
}
