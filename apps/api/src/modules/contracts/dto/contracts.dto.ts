import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus, ContractType, DealCurrency, SignerStatus } from '@prisma/client';

export class CreateContractDto {
  @ApiPropertyOptional({ example: 'Contrato de Prestacao de Servicos' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ContractType })
  @IsOptional()
  @IsEnum(ContractType)
  type?: ContractType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: DealCurrency })
  @IsOptional()
  @IsEnum(DealCurrency)
  currency?: DealCurrency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  object?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoRenewal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  renewalNoticeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  renewalDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publicNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quoteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  signers?: CreateSignerDto[];
}

export class UpdateContractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({ enum: ContractType })
  @IsOptional()
  @IsEnum(ContractType)
  type?: ContractType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalValue?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  object?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoRenewal?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  renewalNoticeDays?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  renewalDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publicNotes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

export class ContractFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tagged?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minValue?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxValue?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFrom?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateTo?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiringBefore?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  renewingBefore?: string;
}

export class CreateSignerDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateSignerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;
  @ApiPropertyOptional({ enum: SignerStatus })
  @IsOptional()
  @IsEnum(SignerStatus)
  status?: SignerStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
