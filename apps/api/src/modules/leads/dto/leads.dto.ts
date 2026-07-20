import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadSource, LeadStatus } from '@prisma/client';

export class CreateLeadDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Acme Inc' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'Manager' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceInfo?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: LeadStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  score?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  value?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;
}

export class LeadFilterDto {
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
  source?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;
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
}

export class ConvertLeadDto {
  @ApiProperty({ example: 'contact' })
  @IsString()
  target: 'contact' | 'company' | 'deal';
}

export class LeadIntakeDto {
  @ApiProperty({ example: 'João' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'joao@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Acme Inc' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: 'Interested in product X' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @ApiProperty({ enum: LeadSource, example: LeadSource.WEBSITE })
  @IsEnum(LeadSource)
  source: LeadSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceDetails?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ example: 'tenant-123' })
  @IsString()
  tenantId: string;
}

export class PublicLeadIntakeDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'joao@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Acme Inc' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: 'Interested in product X' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @ApiProperty({ enum: LeadSource, example: LeadSource.WEBSITE })
  @IsEnum(LeadSource)
  source: LeadSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceDetails?: string;

  @ApiPropertyOptional({ description: 'Honeypot field - must be empty' })
  @IsOptional()
  @IsString()
  website?: string;
}

export class AssignLeadDto {
  @ApiProperty({ example: 'user-456' })
  @IsString()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class DistributeLeadDto {
  @ApiPropertyOptional({ enum: ['round_robin', 'manual'], example: 'round_robin' })
  @IsOptional()
  @IsString()
  strategy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

export interface DistributionConfig {
  strategy: 'round_robin' | 'manual' | 'capacity' | 'source';
  enabled: boolean;
  fallbackOwnerId?: string;
}

export interface RoundRobinState {
  lastIndex: number;
  tenantId: string;
}
