import { IsString, IsOptional, MinLength, MaxLength, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType, TaskStatus, TaskPriority } from '@prisma/client';

export class CreateActivityDto {
  @ApiProperty({ example: 'Call John' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({ enum: ActivityType })
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conversationId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class CreateTaskDto {
  @ApiProperty({ example: 'Send proposal' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;
}

export class ActivityFilterDto {
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
