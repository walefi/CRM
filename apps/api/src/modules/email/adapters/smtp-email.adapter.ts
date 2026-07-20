import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  EmailProviderAdapter,
  SendEmailOptions,
  SendEmailResult,
} from './email-provider.adapter';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export class SmtpEmailAdapter implements EmailProviderAdapter {
  private readonly logger = new Logger(SmtpEmailAdapter.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    });
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const info = await this.transporter.sendMail({
      from: options.from,
      to: options.to.join(', '),
      cc: options.cc?.join(', '),
      bcc: options.bcc?.join(', '),
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments,
    });

    return {
      messageId: info.messageId,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
      pending: info.pending || [],
    };
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error: any) {
      this.logger.warn(`SMTP verification failed: ${error.message}`);
      return false;
    }
  }
}
