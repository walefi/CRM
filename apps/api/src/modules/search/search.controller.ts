import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import {
  SearchQueryDto,
  SuggestQueryDto,
  ReindexDto,
  IndexDocumentDto,
  SaveSearchFilterDto,
} from './dto/search.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across all entities' })
  search(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query() dto: SearchQueryDto,
  ) {
    return this.searchService.search(tenantId, dto, userId);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Autocomplete suggestions' })
  suggest(@CurrentUser('tenantId') tenantId: string, @Query() dto: SuggestQueryDto) {
    return this.searchService.suggest(tenantId, dto.q, dto.limit);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get search history' })
  getHistory(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.getHistory(tenantId, userId, page, limit);
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Get favorite items' })
  getFavorites(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.getFavorites(tenantId, userId, page, limit);
  }

  @Post('favorites')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Add item to favorites' })
  addFavorite(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { entityType: string; entityId: string; title: string; url?: string },
  ) {
    return this.searchService.addFavorite(
      tenantId,
      userId,
      body.entityType,
      body.entityId,
      body.title,
      body.url,
    );
  }

  @Delete('favorites/:entityType/:entityId')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from favorites' })
  removeFavorite(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.searchService.removeFavorite(tenantId, userId, entityType, entityId);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Get saved search filters' })
  getSavedFilters(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.searchService.getSavedFilters(tenantId, userId);
  }

  @Post('filters')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Save search filter' })
  saveFilter(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SaveSearchFilterDto,
  ) {
    return this.searchService.saveFilter(tenantId, userId, dto.name, dto.filters, dto.isShared);
  }

  @Delete('filters/:filterId')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete saved filter' })
  deleteFilter(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('filterId') filterId: string,
  ) {
    return this.searchService.deleteFilter(tenantId, userId, filterId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get search engine statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.searchService.getStats(tenantId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Search engine health check' })
  healthCheck() {
    return this.searchService.healthCheck();
  }

  @Post('reindex')
  @Roles('admin')
  @ApiOperation({ summary: 'Rebuild full search index' })
  reindex(@CurrentUser('tenantId') tenantId: string, @Body() dto: ReindexDto) {
    return this.searchService.reindex(tenantId, dto.entityType);
  }

  @Post('index')
  @Roles('admin')
  @ApiOperation({ summary: 'Index a single document' })
  index(@CurrentUser('tenantId') tenantId: string, @Body() dto: IndexDocumentDto) {
    return this.searchService.index(tenantId, {
      entityType: dto.entityType,
      entityId: dto.entityId,
      title: dto.title,
      subtitle: dto.subtitle,
      content: dto.content,
      tags: dto.tags || [],
      metadata: dto.metadata,
      url: dto.url,
    });
  }

  @Delete('index/:entityType/:entityId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove document from index' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.searchService.remove(tenantId, entityType, entityId);
  }
}
