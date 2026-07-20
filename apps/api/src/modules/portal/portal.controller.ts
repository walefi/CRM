import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerDashboardService } from './customer-dashboard.service';
import { PortalAccessLogService } from './portal-access-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Request } from 'express';

@ApiTags('Portal')
@Controller('portal')
export class PortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly authService: CustomerAuthService,
    private readonly dashboardService: CustomerDashboardService,
    private readonly accessLog: PortalAccessLogService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Portal login' })
  async login(
    @Req() req: Request,
    @Body() dto: { email: string; password: string; tenantId?: string },
  ) {
    const tenantId = dto.tenantId || (req as any).tenantId || '';
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(tenantId, dto.email, dto.password, ip, userAgent);
    await this.accessLog
      .log({
        userId: result.user.id,
        action: 'login',
        resource: 'auth',
        ip,
        userAgent,
        tenantId,
      })
      .catch(() => {});
    return result;
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Portal logout' })
  async logout(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    await this.authService.logout(tenantId, userId, accessToken);
    await this.accessLog
      .log({
        userId,
        action: 'logout',
        resource: 'auth',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        tenantId,
      })
      .catch(() => {});
    return { success: true };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh portal token' })
  async refresh(@Body() dto: { refreshToken: string; tenantId?: string }) {
    const tenantId = dto.tenantId || '';
    return this.authService.refresh(tenantId, dto.refreshToken);
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register portal user' })
  async register(
    @Body()
    dto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      tenantId?: string;
    },
  ) {
    const tenantId = dto.tenantId || '';
    return this.authService.register(tenantId, dto);
  }

  @Post('password/reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  async resetPassword(@Body() dto: { email: string; tenantId?: string }) {
    const tenantId = dto.tenantId || '';
    return this.authService.resetPassword(tenantId, dto.email);
  }

  @Post('password/change')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(tenantId, userId, dto.currentPassword, dto.newPassword);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'List active sessions' })
  async getSessions(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.authService.getSessions(tenantId, userId);
  }

  @Get('dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Customer portal dashboard' })
  async getDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const result = await this.dashboardService.getDashboard(tenantId, userId);
    await this.accessLog
      .log({
        userId,
        action: 'view_dashboard',
        resource: 'dashboard',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        tenantId,
      })
      .catch(() => {});
    return result;
  }

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Get profile' })
  getProfile(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.portalService.getProfile(tenantId, userId);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Update profile' })
  updateProfile(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { firstName?: string; lastName?: string; phone?: string; title?: string },
  ) {
    return this.portalService.updateProfile(tenantId, userId, dto);
  }

  @Get('tickets')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Customer tickets' })
  getTickets(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.portalService.getPortalTickets(tenantId, page, limit);
  }

  @Get('documents')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Customer documents' })
  getDocuments(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.portalService.getPortalDocuments(tenantId, page, limit);
  }

  @Get('contracts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Customer contracts' })
  getContracts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.portalService.getPortalContracts(tenantId, page, limit);
  }

  @Get('proposals')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Customer proposals' })
  getQuotes(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.portalService.getPortalQuotes(tenantId, page, limit);
  }

  @Get('conversations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Customer conversations' })
  getConversations(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.portalService.getPortalConversations(tenantId, page, limit);
  }

  @Get('notifications')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Portal notifications' })
  getNotifications(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.portalService.getNotifications(tenantId, userId, page, limit);
  }

  @Patch('notifications/:id/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Mark notification as read' })
  markNotificationRead(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.portalService.markNotificationRead(tenantId, userId, id);
  }

  @Post('notifications/read-all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllNotificationsRead(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.portalService.markAllNotificationsRead(tenantId, userId);
  }

  @Get('access-logs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Portal access logs' })
  getAccessLogs(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.accessLog.getLogs(tenantId, userId, { page, limit });
  }
}
