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
import { EmailService } from './email.service';
import { SendEmailDto, CreateEmailAccountDto } from './dto/send-email.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Email')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send email' })
  send(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendEmailDto,
  ) {
    return this.emailService.sendEmail(tenantId, userId, dto);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'List email accounts' })
  getAccounts(@CurrentUser('tenantId') tenantId: string) {
    return this.emailService.getAccounts(tenantId);
  }

  @Post('accounts')
  @Roles('admin')
  @ApiOperation({ summary: 'Create email account' })
  createAccount(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateEmailAccountDto,
  ) {
    return this.emailService.createAccount(tenantId, dto);
  }

  @Delete('accounts/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete email account' })
  deleteAccount(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.emailService.deleteAccount(tenantId, id);
  }

  @Post('accounts/:id/test')
  @ApiOperation({ summary: 'Test email account' })
  testAccount(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body('recipientEmail') recipientEmail: string,
  ) {
    return this.emailService.testAccount(tenantId, id, recipientEmail);
  }
}
