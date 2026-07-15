import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanySettingsDto {
  // General
  @ApiPropertyOptional({ example: 'Acme Inc' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ example: 'Acme Tecnologia Ltda' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ example: '123.456.789.000' })
  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '+5511999999998' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ example: '+5511999999997' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'contato@acme.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsOptional()
  @IsString()
  website?: string;

  // Address
  @ApiPropertyOptional({ example: 'Avenida Paulista, 1000' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: 'Bela Vista' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  state?: string;

  @ApiPropertyOptional({ example: 'Brasil' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '01310-100' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  // Branding
  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#1D4ED8' })
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  // Regional
  @ApiPropertyOptional({ example: 'pt-BR' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'DD/MM/YYYY' })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ example: 'HH:mm' })
  @IsOptional()
  @IsString()
  timeFormat?: string;

  @ApiPropertyOptional({ example: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: ',' })
  @IsOptional()
  @IsString()
  decimalSeparator?: string;

  @ApiPropertyOptional({ example: '.' })
  @IsOptional()
  @IsString()
  thousandsSeparator?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  firstDayOfWeek?: number;
}

export class SmtpSettingsDto {
  @ApiPropertyOptional({ example: 'smtp.gmail.com' })
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @ApiPropertyOptional({ example: 587 })
  @IsOptional()
  @IsNumber()
  smtpPort?: number;

  @ApiPropertyOptional({ example: 'notifications@acme.com' })
  @IsOptional()
  @IsEmail()
  smtpUser?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  smtpUseTls?: boolean;

  @ApiPropertyOptional({ example: 'Acme CRM' })
  @IsOptional()
  @IsString()
  senderName?: string;

  @ApiPropertyOptional({ example: 'no-reply@acme.com' })
  @IsOptional()
  @IsEmail()
  senderEmail?: string;
}

export class NotificationSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  desktopNotifications?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  whatsappNotifications?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;
}

export class SecuritySettingsDto {
  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  minPasswordLength?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requireSpecialChars?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requireNumbers?: boolean;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  sessionTimeout?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  maxLoginAttempts?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;
}

export class FileSettingsDto {
  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  maxUploadSizeMb?: number;

  @ApiPropertyOptional({ example: 'jpg,png,pdf,docx,xlsx' })
  @IsOptional()
  @IsString()
  allowedFileTypes?: string;

  @ApiPropertyOptional({ example: 'local' })
  @IsOptional()
  @IsString()
  storageProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  s3Config?: Record<string, string>;
}

export class TestEmailDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail()
  recipient: string;
}
