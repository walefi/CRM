import { IsString, IsOptional, MinLength, MaxLength, IsEmail, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
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
  mobile?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedin?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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
  mobile?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;
}

export class ContactFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;
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
}
