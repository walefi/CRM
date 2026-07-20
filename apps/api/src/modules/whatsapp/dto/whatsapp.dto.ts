import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendWhatsAppMessageDto {
  @ApiProperty({ description: 'Recipient phone number in E.164 format', example: '+5511999999999' })
  @IsString()
  to: string;

  @ApiPropertyOptional({ description: 'Conversation ID to associate the message with' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ description: 'Message text content' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Phone number ID from Meta to send from' })
  @IsOptional()
  @IsString()
  phoneNumberId?: string;
}

export class WhatsAppConfigDto {
  @ApiProperty({ description: 'Meta App ID' })
  @IsString()
  appId: string;

  @ApiProperty({ description: 'Meta App Secret' })
  @IsString()
  appSecret: string;

  @ApiProperty({ description: 'Phone Number ID from Meta' })
  @IsString()
  phoneNumberId: string;

  @ApiProperty({ description: 'WhatsApp Business Account ID' })
  @IsString()
  wabaId: string;

  @ApiProperty({ description: 'Webhook verify token' })
  @IsString()
  verifyToken: string;

  @ApiPropertyOptional({ description: 'Access token (for outbound messages)' })
  @IsOptional()
  @IsString()
  accessToken?: string;
}

export class WhatsAppWebhookQueryDto {
  @ApiProperty({ description: 'Hub mode', example: 'subscribe' })
  @IsString()
  'hub.mode': string;

  @ApiProperty({ description: 'Hub verify token' })
  @IsString()
  'hub.verify_token': string;

  @ApiProperty({ description: 'Hub challenge' })
  @IsString()
  'hub.challenge': string;
}
