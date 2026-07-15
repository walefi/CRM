import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteFilterDto,
  CreateQuoteItemDto,
  UpdateQuoteItemDto,
  CreateQuoteTemplateDto,
} from './dto/quotes.dto';

@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller()
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('quotes')
  @ApiOperation({ summary: 'Listar propostas com filtros' })
  findAll(@CurrentUser('tenantId') t: string, @Query() f: QuoteFilterDto) {
    return this.quotesService.findAll(t, f);
  }

  @Get('quotes/stats')
  @ApiOperation({ summary: 'Estatísticas de propostas' })
  getStats(@CurrentUser('tenantId') t: string) {
    return this.quotesService.getStats(t);
  }

  @Get('quotes/templates')
  @ApiOperation({ summary: 'Listar templates de propostas' })
  findTemplates(@CurrentUser('tenantId') t: string) {
    return this.quotesService.findTemplates(t);
  }

  @Post('quotes/templates')
  @ApiOperation({ summary: 'Criar template de proposta' })
  @Roles('admin')
  createTemplate(
    @Body() d: CreateQuoteTemplateDto,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.quotesService.createTemplate(t, d, u);
  }

  @Patch('quotes/templates/:id')
  @ApiOperation({ summary: 'Atualizar template' })
  @Roles('admin')
  updateTemplate(
    @Param('id') id: string,
    @Body() d: Partial<CreateQuoteTemplateDto>,
    @CurrentUser('tenantId') t: string,
  ) {
    return this.quotesService.updateTemplate(id, t, d);
  }

  @Delete('quotes/templates/:id')
  @ApiOperation({ summary: 'Excluir template' })
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTemplate(@Param('id') id: string) {
    return this.quotesService.deleteTemplate(id);
  }

  @Get('quotes/export/:id')
  @ApiOperation({ summary: 'Exportar proposta' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'excel', 'pdf', 'html'] })
  exportQuote(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @Query('format') f?: string,
  ) {
    return this.quotesService.exportQuote(id, t, f || 'json');
  }

  @Get('quotes/:id')
  @ApiOperation({ summary: 'Buscar proposta por ID' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') t: string) {
    return this.quotesService.findById(id, t);
  }

  @Post('quotes')
  @ApiOperation({ summary: 'Criar proposta' })
  create(
    @Body() d: CreateQuoteDto,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.quotesService.create(t, d, u);
  }

  @Patch('quotes/:id')
  @ApiOperation({ summary: 'Atualizar proposta' })
  update(
    @Param('id') id: string,
    @Body() d: UpdateQuoteDto,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.quotesService.update(id, t, d, u);
  }

  @Delete('quotes/:id')
  @ApiOperation({ summary: 'Excluir proposta (soft delete)' })
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.quotesService.remove(id, t, u);
  }

  @Post('quotes/:id/archive')
  @ApiOperation({ summary: 'Arquivar proposta' })
  archive(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.quotesService.archive(id, t, u);
  }

  @Post('quotes/:id/restore')
  @ApiOperation({ summary: 'Restaurar proposta' })
  restore(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.quotesService.restore(id, t, u);
  }

  @Post('quotes/:id/duplicate')
  @ApiOperation({ summary: 'Duplicar proposta' })
  duplicate(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.quotesService.duplicate(id, t, u);
  }

  @Post('quotes/:id/send')
  @ApiOperation({ summary: 'Enviar proposta' })
  sendQuote(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.quotesService.sendQuote(id, t, u);
  }

  @Get('quotes/:id/items')
  @ApiOperation({ summary: 'Listar itens da proposta' })
  getItems(@Param('id') id: string, @CurrentUser('tenantId') t: string) {
    return this.quotesService.findById(id, t);
  }

  @Post('quotes/:id/items')
  @ApiOperation({ summary: 'Adicionar item à proposta' })
  addItem(
    @Param('id') id: string,
    @Body() d: CreateQuoteItemDto,
    @CurrentUser('tenantId') t: string,
  ) {
    return this.quotesService.addItem(id, t, d);
  }

  @Patch('quotes/:id/items/:itemId')
  @ApiOperation({ summary: 'Atualizar item da proposta' })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() d: UpdateQuoteItemDto,
    @CurrentUser('tenantId') t: string,
  ) {
    return this.quotesService.updateItem(id, itemId, t, d);
  }

  @Delete('quotes/:id/items/:itemId')
  @ApiOperation({ summary: 'Remover item da proposta' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser('tenantId') t: string,
  ) {
    return this.quotesService.removeItem(id, itemId, t);
  }

  @Post('quotes/:id/items/reorder')
  @ApiOperation({ summary: 'Reordenar itens' })
  reorderItems(
    @Param('id') id: string,
    @Body() body: { itemIds: string[] },
    @CurrentUser('tenantId') t: string,
  ) {
    return this.quotesService.reorderItems(id, t, body.itemIds);
  }

  @Get('quotes/:id/versions')
  @ApiOperation({ summary: 'Visualizar histórico de versões' })
  getVersions(@Param('id') id: string, @CurrentUser('tenantId') t: string) {
    return this.quotesService.getVersions(id, t);
  }

  @Post('quotes/:id/versions/:versionId/restore')
  @ApiOperation({ summary: 'Restaurar versão anterior' })
  restoreVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.quotesService.restoreVersion(id, versionId, t, u);
  }
}
