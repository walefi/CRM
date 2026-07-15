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
import { QuoteStatus, DealCurrency } from '@prisma/client';

export class CreateQuoteDto {
  @ApiPropertyOptional({ example: 'Proposta Comercial 001/2024' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DealCurrency })
  @IsOptional()
  @IsEnum(DealCurrency)
  currency?: DealCurrency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  shipping?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commercialConditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;

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
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  items?: CreateQuoteItemDto[];
}

export class UpdateQuoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({ enum: QuoteStatus })
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;
  @ApiPropertyOptional({ enum: DealCurrency })
  @IsOptional()
  @IsEnum(DealCurrency)
  currency?: DealCurrency;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  subtotal?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discount?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discountPercent?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxes?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  shipping?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commercialConditions?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNotes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedAt?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;
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

export class QuoteFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
  @ApiPropertyOptional({ enum: QuoteStatus })
  @IsOptional()
  @IsString()
  status?: string;
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
  @IsString()
  validUntil?: string;
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
}

export class CreateQuoteItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ example: 'Desenvolvimento de software' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ default: 'product' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateQuoteItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantity?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitPrice?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  costPrice?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discount?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discountPercent?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxes?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxPercent?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateQuoteTemplateDto {
  @ApiProperty({ example: 'Modelo Comercial' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 'commercial' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty()
  content: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
