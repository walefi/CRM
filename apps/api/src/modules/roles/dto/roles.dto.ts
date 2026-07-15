import { IsString, IsOptional, MinLength, MaxLength, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Sales Manager' })
  @IsString() @MinLength(2) @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray()
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray()
  permissionIds?: string[];
}
