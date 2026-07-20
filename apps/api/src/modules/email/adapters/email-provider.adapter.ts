export interface SendEmailOptions {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SendEmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  pending: string[];
}

export interface EmailProviderAdapter {
  send(options: SendEmailOptions): Promise<SendEmailResult>;
  verify(): Promise<boolean>;
}
