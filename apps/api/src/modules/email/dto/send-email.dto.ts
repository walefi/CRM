import { IsString, IsEmail, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email addresses' })
  @IsEmail({}, { each: true })
  to: string[];

  @ApiPropertyOptional({ description: 'CC email addresses' })
  @IsOptional()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({ description: 'BCC email addresses' })
  @IsOptional()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ description: 'Plain text body' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ description: 'HTML body' })
  @IsString()
  html: string;

  @ApiPropertyOptional({ description: 'Conversation ID to link' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Contact ID to link' })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Email account ID to use' })
  @IsOptional()
  @IsString()
  emailAccountId?: string;

  @ApiPropertyOptional({ description: 'Reply-To email address' })
  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @ApiPropertyOptional({ description: 'Attachments' })
  @IsOptional()
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

export class CreateEmailAccountDto {
  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: 'SMTP host' })
  @IsString()
  host: string;

  @ApiProperty({ description: 'SMTP port', default: 587 })
  @IsInt()
  port: number = 587;

  @ApiProperty({ description: 'Use TLS/SSL', default: false })
  @IsBoolean()
  secure: boolean = false;

  @ApiProperty({ description: 'SMTP username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'SMTP password' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'From name' })
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional({ description: 'From email' })
  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @ApiPropertyOptional({ description: 'Set as default account' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
