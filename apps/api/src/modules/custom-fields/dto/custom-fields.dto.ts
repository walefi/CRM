import { IsString, IsOptional, IsBoolean, IsNumber, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomFieldDto {
  @ApiProperty({ example: 'CNPJ da Empresa' })
  @IsString() @MinLength(2) @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'cnpj' })
  @IsString() @MinLength(2) @MaxLength(100)
  key: string;

  @ApiProperty({ example: 'companies' })
  @IsString()
  entity: string;

  @ApiProperty({ example: 'text' })
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  placeholder?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  helpText?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isReadonly?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  defaultValue?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  regex?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  mask?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  minLength?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  maxLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  options?: { label: string; value: string; color?: string }[];

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  sortOrder?: number;
}

export class UpdateCustomFieldDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  placeholder?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  helpText?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isReadonly?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  defaultValue?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  options?: { label: string; value: string; color?: string }[];

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  status?: string;
}

export class CustomFieldValueDto {
  @ApiProperty()
  @IsString()
  customFieldId: string;

  @ApiProperty()
  @IsString()
  value: string;
}
