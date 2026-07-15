import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  IsBoolean,
  IsObject,
  ValidateNested,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutomationStatus, TriggerType, ActionType } from '@prisma/client';

export enum ConditionOperatorDto {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_OR_EQUAL = 'GREATER_OR_EQUAL',
  LESS_OR_EQUAL = 'LESS_OR_EQUAL',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  IS_EMPTY = 'IS_EMPTY',
  IS_NOT_EMPTY = 'IS_NOT_EMPTY',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  BETWEEN = 'BETWEEN',
  REGEX = 'REGEX',
  BEFORE = 'BEFORE',
  AFTER = 'AFTER',
  IS_TRUE = 'IS_TRUE',
  IS_FALSE = 'IS_FALSE',
}

export enum ScheduleFrequencyDto {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  CRON = 'CRON',
  INTERVAL = 'INTERVAL',
  AFTER_EVENT = 'AFTER_EVENT',
}

export enum AutomationLogLevelDto {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  TRACE = 'TRACE',
}

export class CreateTriggerDto {
  @ApiProperty({ enum: TriggerType })
  @IsEnum(TriggerType)
  type: TriggerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class CreateConditionDto {
  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty({ enum: ConditionOperatorDto })
  @IsEnum(ConditionOperatorDto)
  operator: ConditionOperatorDto;

  @ApiProperty()
  @IsString()
  value: string;

  @ApiPropertyOptional({ default: 'AND', enum: ['AND', 'OR'] })
  @IsOptional()
  @IsString()
  logic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateActionDto {
  @ApiProperty({ enum: ActionType })
  @IsEnum(ActionType)
  type: ActionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  delay?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class CreateScheduleDto {
  @ApiProperty({ example: 'Daily at 9am' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ScheduleFrequencyDto, default: ScheduleFrequencyDto.ONCE })
  @IsEnum(ScheduleFrequencyDto)
  frequency: ScheduleFrequencyDto;

  @ApiPropertyOptional({ example: '0 9 * * *' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ example: 3600 })
  @IsOptional()
  @IsNumber()
  interval?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ default: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class CreateVariableDto {
  @ApiProperty({ example: 'Sales Email Template' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'sales_email_template' })
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  value: string;

  @ApiPropertyOptional({ default: 'string' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;
}

export class CreateAutomationDto {
  @ApiProperty({ example: 'Lead Welcome Automation' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Sends welcome email when a new lead is created' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  cooldown?: number;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @ApiPropertyOptional({ example: ['sales', 'automation'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [CreateTriggerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTriggerDto)
  triggers?: CreateTriggerDto[];

  @ApiPropertyOptional({ type: [CreateConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConditionDto)
  conditions?: CreateConditionDto[];

  @ApiPropertyOptional({ type: [CreateActionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActionDto)
  actions?: CreateActionDto[];

  @ApiPropertyOptional({ type: [CreateScheduleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScheduleDto)
  schedules?: CreateScheduleDto[];

  @ApiPropertyOptional({ type: [CreateVariableDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariableDto)
  variables?: CreateVariableDto[];
}

export class UpdateAutomationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: AutomationStatus })
  @IsOptional()
  @IsEnum(AutomationStatus)
  status?: AutomationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cooldown?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [CreateTriggerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTriggerDto)
  triggers?: CreateTriggerDto[];

  @ApiPropertyOptional({ type: [CreateConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConditionDto)
  conditions?: CreateConditionDto[];

  @ApiPropertyOptional({ type: [CreateActionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActionDto)
  actions?: CreateActionDto[];

  @ApiPropertyOptional({ type: [CreateScheduleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScheduleDto)
  schedules?: CreateScheduleDto[];

  @ApiPropertyOptional({ type: [CreateVariableDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariableDto)
  variables?: CreateVariableDto[];
}

export class AutomationFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AutomationStatus })
  @IsOptional()
  @IsEnum(AutomationStatus)
  status?: AutomationStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 15;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class RunAutomationDto {
  @ApiPropertyOptional({ example: '123e4567' })
  @IsOptional()
  @IsString()
  automationId?: string;

  @ApiPropertyOptional({ example: 'lead.created' })
  @IsOptional()
  @IsString()
  trigger?: string;

  @ApiPropertyOptional({ example: { leadId: '123', firstName: 'John' } })
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}

export class TestAutomationDto {
  @ApiProperty({ example: '123e4567' })
  @IsOptional()
  @IsString()
  automationId?: string;

  @ApiProperty({ example: 'lead.created' })
  @IsString()
  trigger: string;

  @ApiProperty({ example: { leadId: 'fake-123', firstName: 'Test' } })
  @IsObject()
  input: Record<string, unknown>;
}

export class CreateAutomationTemplateDto {
  @ApiProperty({ example: 'Lead Nurturing Template' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Automated lead nurturing sequence' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'onboarding' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'rocket' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty()
  @IsObject()
  config: Record<string, unknown>;

  @ApiProperty()
  @IsArray()
  triggers: Record<string, unknown>[];

  @ApiProperty()
  @IsArray()
  conditions: Record<string, unknown>[];

  @ApiProperty()
  @IsArray()
  actions: Record<string, unknown>[];

  @ApiProperty()
  @IsArray()
  schedules: Record<string, unknown>[];

  @ApiProperty()
  @IsArray()
  variables: Record<string, unknown>[];
}
