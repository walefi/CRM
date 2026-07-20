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
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'List conversations' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.conversationsService.getConversations(tenantId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Conversation statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.conversationsService.getStats(tenantId);
  }

  @Get('channels')
  @ApiOperation({ summary: 'List channels' })
  getChannels(@CurrentUser('tenantId') tenantId: string) {
    return this.conversationsService.getChannels(tenantId);
  }

  @Post('channels')
  @Roles('admin')
  @ApiOperation({ summary: 'Connect channel' })
  connectChannel(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.conversationsService.connectChannel(tenantId, dto);
  }

  @Delete('channels/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect channel' })
  disconnectChannel(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.conversationsService.disconnectChannel(tenantId, id);
  }

  @Get('queues')
  @ApiOperation({ summary: 'List queues' })
  getQueues(@CurrentUser('tenantId') tenantId: string) {
    return this.conversationsService.getQueues(tenantId);
  }

  @Post('queues')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create queue' })
  createQueue(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.conversationsService.createQueue(tenantId, dto);
  }

  @Delete('queues/:id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete queue' })
  deleteQueue(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.conversationsService.deleteQueue(tenantId, id);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List message templates' })
  getTemplates(@CurrentUser('tenantId') tenantId: string, @Query('channel') channel?: string) {
    return this.conversationsService.getTemplates(tenantId, channel);
  }

  @Post('templates')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create template' })
  createTemplate(@CurrentUser('tenantId') tenantId: string, @Body() dto: any) {
    return this.conversationsService.createTemplate(tenantId, dto);
  }

  @Delete('templates/:id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete template' })
  deleteTemplate(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.conversationsService.deleteTemplate(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create conversation' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.conversationsService.createConversation(tenantId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation' })
  findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.conversationsService.getConversation(tenantId, id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get messages' })
  getMessages(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Query('page') page?: number,
  ) {
    return this.conversationsService.getMessages(tenantId, id, page);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send message' })
  sendMessage(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.conversationsService.sendMessage(tenantId, userId, dto);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send message alias' })
  send(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.conversationsService.sendMessage(tenantId, userId, dto);
  }

  @Post(':id/assign')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Assign conversation' })
  assign(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { userId: string },
  ) {
    return this.conversationsService.assignConversation(tenantId, id, dto.userId);
  }

  @Post(':id/transfer')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Transfer conversation' })
  transfer(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { userId: string },
  ) {
    return this.conversationsService.transferConversation(tenantId, id, dto.userId);
  }

  @Post(':id/resolve')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Resolve conversation' })
  resolve(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.conversationsService.resolveConversation(tenantId, id);
  }

  @Post(':id/archive')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Archive conversation' })
  archive(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.conversationsService.archiveConversation(tenantId, id);
  }

  @Post(':id/reopen')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Reopen conversation' })
  reopen(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.conversationsService.reopenConversation(tenantId, id);
  }

  @Post(':id/notes')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Add note' })
  addNote(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { content: string },
  ) {
    return this.conversationsService.addNote(tenantId, id, userId, dto.content);
  }
}
