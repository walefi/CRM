import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsIn,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type DistributionStrategy = 'round_robin' | 'manual';
export type FallbackBehavior = 'UNASSIGNED' | 'MANUAL_QUEUE';

export interface LeadDistributionConfigData {
  enabled: boolean;
  strategy: DistributionStrategy;
  eligibleUserIds: string[];
  fallbackBehavior: FallbackBehavior;
  notifyOnAssignment: boolean;
}

export const DEFAULT_LEAD_DISTRIBUTION_CONFIG: LeadDistributionConfigData = {
  enabled: false,
  strategy: 'round_robin',
  eligibleUserIds: [],
  fallbackBehavior: 'UNASSIGNED',
  notifyOnAssignment: true,
};

export class UpdateLeadDistributionConfigDto {
  @ApiPropertyOptional({ description: 'Enable/disable automatic lead distribution', example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: ['round_robin', 'manual'], example: 'round_robin' })
  @IsOptional()
  @IsIn(['round_robin', 'manual'])
  strategy?: DistributionStrategy;

  @ApiPropertyOptional({
    description: 'List of user IDs eligible for lead distribution',
    type: [String],
    example: ['user-1', 'user-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  eligibleUserIds?: string[];

  @ApiPropertyOptional({
    enum: ['UNASSIGNED', 'MANUAL_QUEUE'],
    description: 'Behavior when no eligible user is available',
    example: 'UNASSIGNED',
  })
  @IsOptional()
  @IsIn(['UNASSIGNED', 'MANUAL_QUEUE'])
  fallbackBehavior?: FallbackBehavior;

  @ApiPropertyOptional({ description: 'Send notification on lead assignment', example: true })
  @IsOptional()
  @IsBoolean()
  notifyOnAssignment?: boolean;
}
