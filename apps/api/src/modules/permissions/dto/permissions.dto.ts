import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ example: 'Create Users' })
  @IsString() @MinLength(2) @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'users:create' })
  @IsString() @MinLength(2) @MaxLength(100)
  slug: string;

  @ApiProperty({ example: 'users' })
  @IsString()
  resource: string;

  @ApiProperty({ example: 'create' })
  @IsString()
  action: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;
}

export class UpdatePermissionDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;
}
