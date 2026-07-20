export interface IncomingEmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
  contentId?: string;
  inline?: boolean;
}

export interface IncomingEmailPayload {
  provider: string;
  providerMessageId?: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  from: { address: string; name?: string };
  to: Array<{ address: string; name?: string }>;
  cc?: Array<{ address: string; name?: string }>;
  bcc?: Array<{ address: string; name?: string }>;
  replyTo?: { address: string; name?: string };
  subject: string;
  textBody?: string;
  htmlBody?: string;
  receivedAt: Date;
  headers?: Record<string, string>;
  attachments?: IncomingEmailAttachment[];
  emailAccountId?: string;
  tenantId: string;
}

export interface IngestEmailResult {
  messageId: string;
  conversationId: string;
  contactId: string | null;
  status: 'processed' | 'duplicate' | 'error';
  reason?: string;
  attachmentResults?: Array<{
    filename: string;
    status: 'stored' | 'skipped' | 'error';
    warning?: string;
  }>;
}
