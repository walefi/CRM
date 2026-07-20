import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.documentsService.getDocuments(tenantId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Document statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.documentsService.getStats(tenantId);
  }

  @Get('folders')
  @ApiOperation({ summary: 'List folders' })
  getFolders(@CurrentUser('tenantId') tenantId: string, @Query('parentId') parentId?: string) {
    return this.documentsService.getFolders(tenantId, parentId);
  }

  @Post('folders')
  @ApiOperation({ summary: 'Create folder' })
  createFolder(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.documentsService.createFolder(tenantId, userId, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search documents' })
  search(@CurrentUser('tenantId') tenantId: string, @Query('q') q: string, @Query('page') page?: number) {
    return this.documentsService.searchDocuments(tenantId, q, page);
  }

  @Post()
  @ApiOperation({ summary: 'Upload document' })
  upload(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.documentsService.uploadDocument(tenantId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document' })
  findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.documentsService.getDocument(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document' })
  update(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.documentsService.updateDocument(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete document' })
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.documentsService.deleteDocument(tenantId, id);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload alias' })
  uploadAlias(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.documentsService.uploadDocument(tenantId, userId, dto);
  }

  @Post('share')
  @ApiOperation({ summary: 'Share document' })
  share(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.documentsService.shareDocument(tenantId, userId, dto);
  }

  @Post('version')
  @ApiOperation({ summary: 'Add document version' })
  addVersion(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.documentsService.addVersion(tenantId, userId, dto);
  }

  @Post('comment')
  @ApiOperation({ summary: 'Add comment to document' })
  addComment(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.documentsService.addComment(tenantId, userId, dto);
  }

  @Post('favorite')
  @ApiOperation({ summary: 'Toggle favorite' })
  toggleFavorite(@CurrentUser('tenantId') tenantId: string, @Body() dto: { documentId: string }) {
    return this.documentsService.toggleFavorite(tenantId, dto.documentId);
  }
}
