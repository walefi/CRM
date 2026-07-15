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
@Controller('tickets')
export class TicketsController {
  constructor(private readonly helpDeskService: HelpDeskService) {}

  @Get()
  @ApiOperation({ summary: 'List tickets' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() dto: any) {
    return this.helpDeskService.getTickets(tenantId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Help desk statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.helpDeskService.getStats(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create ticket' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.helpDeskService.createTicket(tenantId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket' })
  findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.helpDeskService.getTicket(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.helpDeskService.updateTicket(tenantId, id, userId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete ticket' })
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.helpDeskService.deleteTicket(tenantId, id);
  }

  @Post('comment')
  @ApiOperation({ summary: 'Add comment to ticket' })
  addComment(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { ticketId: string; content: string; isInternal?: boolean },
  ) {
    return this.helpDeskService.addComment(tenantId, dto.ticketId, userId, dto);
  }

  @Post('assign')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Assign ticket' })
  assign(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: { ticketId: string; userId: string },
  ) {
    return this.helpDeskService.assignTicket(tenantId, dto.ticketId, dto.userId);
  }

  @Post('close')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Close ticket' })
  close(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { ticketId: string },
  ) {
    return this.helpDeskService.closeTicket(tenantId, dto.ticketId, userId);
  }

  @Post('reopen')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Reopen ticket' })
  reopen(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { ticketId: string },
  ) {
    return this.helpDeskService.reopenTicket(tenantId, dto.ticketId, userId);
  }
}
