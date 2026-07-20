import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KmService } from './km.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class KmController {
  constructor(private readonly kmService: KmService) {}

  @Get('knowledge')
  @ApiOperation({ summary: 'Knowledge overview' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.kmService.getStats(tenantId);
  }

  @Get('wiki')
  @ApiOperation({ summary: 'List wiki pages' })
  getWiki(@CurrentUser('tenantId') tenantId: string, @Query('category') category?: string) {
    return this.kmService.getWiki(tenantId, category);
  }

  @Get('wiki/:slug')
  @ApiOperation({ summary: 'Get wiki page' })
  getWikiPage(@CurrentUser('tenantId') tenantId: string, @Param('slug') slug: string) {
    return this.kmService.getWikiPage(tenantId, slug);
  }

  @Post('wiki')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create wiki page' })
  createWiki(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.kmService.createWiki(tenantId, userId, dto);
  }

  @Get('faq')
  @ApiOperation({ summary: 'List FAQs' })
  getFAQs(@CurrentUser('tenantId') tenantId: string, @Query('category') category?: string) {
    return this.kmService.getFAQs(tenantId, category);
  }

  @Post('faq')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create FAQ' })
  createFAQ(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.kmService.createFAQ(tenantId, userId, dto);
  }

  @Get('collections')
  @ApiOperation({ summary: 'List knowledge collections' })
  getCollections(@CurrentUser('tenantId') tenantId: string) {
    return this.kmService.getCollections(tenantId);
  }

  @Post('collections')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create collection' })
  createCollection(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.kmService.createCollection(tenantId, userId, dto);
  }
}
