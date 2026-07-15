import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TimelineService } from './timeline.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Timeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get()
  @ApiOperation({ summary: 'Get unified timeline' })
  getTimeline(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.timelineService.getTimeline(tenantId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Timeline statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.timelineService.getStats(tenantId);
  }

  @Get('entity/:entity/:entityId')
  @ApiOperation({ summary: 'Timeline by entity' })
  getByEntity(
    @CurrentUser('tenantId') tenantId: string,
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
    @Query('page') page?: number,
  ) {
    return this.timelineService.getByEntity(tenantId, entity, entityId, page);
  }

  @Get('module/:module')
  @ApiOperation({ summary: 'Timeline by module' })
  getByModule(
    @CurrentUser('tenantId') tenantId: string,
    @Param('module') module: string,
    @Query('page') page?: number,
  ) {
    return this.timelineService.getByModule(tenantId, module, page);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search timeline' })
  searchTimeline(
    @CurrentUser('tenantId') tenantId: string,
    @Query('q') q: string,
    @Query('page') page?: number,
  ) {
    return this.timelineService.searchTimeline(tenantId, q, page);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get timeline comments' })
  getComments(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.timelineService.getComments(tenantId, id);
  }

  @Post('comment')
  @ApiOperation({ summary: 'Add comment' })
  addComment(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.timelineService.addComment(tenantId, userId, dto);
  }

  @Patch('comment/:id')
  @ApiOperation({ summary: 'Update comment' })
  updateComment(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { content: string },
  ) {
    return this.timelineService.updateComment(tenantId, id, dto.content);
  }

  @Delete('comment/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete comment' })
  deleteComment(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.timelineService.deleteComment(tenantId, id);
  }

  @Post('reaction')
  @ApiOperation({ summary: 'Toggle reaction' })
  addReaction(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.timelineService.addReaction(tenantId, userId, dto);
  }

  @Post('bookmark')
  @ApiOperation({ summary: 'Bookmark timeline event' })
  addBookmark(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { timelineId: string },
  ) {
    return this.timelineService.addBookmark(tenantId, userId, dto.timelineId);
  }
}
