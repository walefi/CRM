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
import { ContractsService } from './contracts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateContractDto,
  UpdateContractDto,
  ContractFilterDto,
  CreateSignerDto,
  UpdateSignerDto,
} from './dto/contracts.dto';

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller()
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('contracts')
  @ApiOperation({ summary: 'Listar contratos com filtros' })
  findAll(@CurrentUser('tenantId') t: string, @Query() f: ContractFilterDto) {
    return this.contractsService.findAll(t, f);
  }

  @Get('contracts/stats')
  @ApiOperation({ summary: 'Estatisticas de contratos' })
  getStats(@CurrentUser('tenantId') t: string) {
    return this.contractsService.getStats(t);
  }

  @Get('contracts/export/:id')
  @ApiOperation({ summary: 'Exportar contrato' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  exportContract(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @Query('format') f?: string,
  ) {
    return this.contractsService.exportContract(id, t, f || 'json');
  }

  @Get('contracts/:id')
  @ApiOperation({ summary: 'Buscar contrato por ID' })
  findById(@Param('id') id: string, @CurrentUser('tenantId') t: string) {
    return this.contractsService.findById(id, t);
  }

  @Post('contracts')
  @ApiOperation({ summary: 'Criar contrato' })
  create(
    @Body() d: CreateContractDto,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.contractsService.create(t, d, u);
  }

  @Patch('contracts/:id')
  @ApiOperation({ summary: 'Atualizar contrato' })
  update(
    @Param('id') id: string,
    @Body() d: UpdateContractDto,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.contractsService.update(id, t, d, u);
  }

  @Delete('contracts/:id')
  @ApiOperation({ summary: 'Excluir contrato (soft delete)' })
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.contractsService.remove(id, t, u);
  }

  @Post('contracts/:id/archive')
  @ApiOperation({ summary: 'Arquivar contrato' })
  archive(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.contractsService.archive(id, t, u);
  }

  @Post('contracts/:id/restore')
  @ApiOperation({ summary: 'Restaurar contrato' })
  restore(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.contractsService.restore(id, t, u);
  }

  @Post('contracts/:id/duplicate')
  @ApiOperation({ summary: 'Duplicar contrato' })
  duplicate(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.contractsService.duplicate(id, t, u);
  }

  @Post('contracts/:id/renew')
  @ApiOperation({ summary: 'Renovar contrato' })
  renew(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.contractsService.renew(id, t, u);
  }

  @Post('contracts/:id/send')
  @ApiOperation({ summary: 'Enviar para assinatura' })
  sendForSignature(
    @Param('id') id: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.contractsService.sendForSignature(id, t, u);
  }

  @Post('contracts/convert-from-quote')
  @ApiOperation({ summary: 'Converter proposta em contrato' })
  convertFromQuote(
    @Body() body: { quoteId: string },
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.contractsService.convertFromQuote(t, body.quoteId, u);
  }

  @Post('contracts/:id/signers')
  @ApiOperation({ summary: 'Adicionar signatario' })
  addSigner(
    @Param('id') id: string,
    @Body() d: CreateSignerDto,
    @CurrentUser('tenantId') t: string,
  ) {
    return this.contractsService.addSigner(id, t, d);
  }

  @Patch('contracts/:id/signers/:signerId')
  @ApiOperation({ summary: 'Atualizar signatario' })
  updateSigner(
    @Param('id') id: string,
    @Param('signerId') signerId: string,
    @Body() d: UpdateSignerDto,
    @CurrentUser('tenantId') t: string,
  ) {
    return this.contractsService.updateSigner(id, signerId, t, d);
  }

  @Delete('contracts/:id/signers/:signerId')
  @ApiOperation({ summary: 'Remover signatario' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSigner(
    @Param('id') id: string,
    @Param('signerId') signerId: string,
    @CurrentUser('tenantId') t: string,
  ) {
    return this.contractsService.removeSigner(id, signerId, t);
  }

  @Get('contracts/:id/versions')
  @ApiOperation({ summary: 'Historico de versoes' })
  getVersions(@Param('id') id: string, @CurrentUser('tenantId') t: string) {
    return this.contractsService.getVersions(id, t);
  }

  @Post('contracts/:id/versions/:versionId/restore')
  @ApiOperation({ summary: 'Restaurar versao anterior' })
  restoreVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUser('tenantId') t: string,
    @CurrentUser('id') u?: string,
  ) {
    return this.contractsService.restoreVersion(id, versionId, t, u);
  }
}
