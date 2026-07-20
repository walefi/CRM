export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  connTimeout?: number;
  authTimeout?: number;
}

export interface ImapAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
  contentId?: string;
  inline: boolean;
}

export interface ImapMessage {
  uid: number;
  uidValidity: number;
  messageId: string;
  from: { address: string; name?: string };
  to: Array<{ address: string; name?: string }>;
  cc?: Array<{ address: string; name?: string }>;
  bcc?: Array<{ address: string; name?: string }>;
  replyTo?: { address: string; name?: string };
  subject: string;
  text?: string;
  html?: string;
  date: Date;
  inReplyTo?: string;
  references?: string[];
  headers?: Record<string, string>;
  attachments?: ImapAttachment[];
  isRead: boolean;
}

export interface ImapAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  fetchUnseen(): Promise<ImapMessage[]>;
  markAsRead(uid: number): Promise<void>;
}
