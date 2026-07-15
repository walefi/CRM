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
import { HelpDeskService } from './help-desk.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('HelpDesk')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly helpDeskService: HelpDeskService) {}

  @Get()
  @ApiOperation({ summary: 'List knowledge articles' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.helpDeskService.getArticles(tenantId, dto);
  }

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create article' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.helpDeskService.createArticle(tenantId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get article' })
  findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.helpDeskService.getArticle(tenantId, id);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update article' })
  update(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.helpDeskService.updateArticle(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete article' })
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.helpDeskService.deleteArticle(tenantId, id);
  }
}
