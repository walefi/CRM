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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto, ContactFilterDto } from './dto/contacts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List contacts with filters' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() filters: ContactFilterDto) {
    return this.contactsService.findAll(tenantId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get contacts statistics' })
  getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.contactsService.getStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact with deals and notes' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.contactsService.findById(id, tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create contact' })
  create(
    @Body() dto: CreateContactDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.contactsService.create(tenantId, dto, userId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update contact' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.contactsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete contact' })
  remove(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.contactsService.remove(id, tenantId);
  }
}
