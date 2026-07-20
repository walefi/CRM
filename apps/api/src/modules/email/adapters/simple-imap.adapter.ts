import { Logger } from '@nestjs/common';
import { ImapAdapter, ImapConfig, ImapMessage, ImapAttachment } from './imap-email.adapter';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Imap = require('imap');

export class SimpleImapAdapter implements ImapAdapter {
  private readonly logger = new Logger(SimpleImapAdapter.name);
  private imap: any = null;
  private _uidValidity: number = 0;

  constructor(private readonly config: ImapConfig) {}

  get uidValidity(): number {
    return this._uidValidity;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.imap = new Imap({
          user: this.config.username,
          password: this.config.password,
          host: this.config.host,
          port: this.config.port,
          tls: this.config.secure,
          tlsOptions: { rejectUnauthorized: false },
          connTimeout: this.config.connTimeout ?? 10000,
          authTimeout: this.config.authTimeout ?? 5000,
        });

        this.imap.once('ready', () => {
          this.logger.log(`IMAP connected to ${this.config.host}:${this.config.port}`);
          resolve();
        });

        this.imap.once('error', (err: Error) => {
          this.logger.error(`IMAP connection error: ${err.message}`);
          reject(err);
        });

        this.imap.connect();
      } catch (error: any) {
        this.logger.error(`IMAP connect failed: ${error.message}`);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.imap) {
      try {
        this.imap.end();
      } catch {
        // ignore close errors
      }
      this.imap = null;
    }
  }

  async fetchUnseen(): Promise<ImapMessage[]> {
    if (!this.imap) throw new Error('IMAP not connected');

    return new Promise((resolve, reject) => {
      const imapRef = this.imap;

      imapRef.openBox('INBOX', true, (err: Error | null, box: any) => {
        if (err) return reject(new Error(`Failed to open INBOX: ${err.message}`));

        this._uidValidity = box?.uidvalidity ?? 0;

        imapRef.search(['UNSEEN'], (err: Error | null, results: number[]) => {
          if (err) return reject(new Error(`Search failed: ${err.message}`));
          if (!results || results.length === 0) return resolve([]);

          const messages: ImapMessage[] = [];
          let pending = results.length;

          const fetcher = imapRef.fetch(results, {
            bodies: '',
            markSeen: false,
            struct: true,
          });

          fetcher.on('message', (msg: any, seqno: number) => {
            let uid = seqno;
            let rawBuffer = Buffer.alloc(0);

            msg.on('attributes', (attrs: any) => {
              uid = attrs.uid;
            });

            msg.on('body', (stream: any) => {
              const chunks: Buffer[] = [];
              stream.on('data', (chunk: Buffer) => { chunks.push(chunk); });
              stream.on('end', () => {
                rawBuffer = Buffer.concat(chunks);
              });
            });

            msg.on('end', () => {
              this.parseWithMailparser(rawBuffer, uid)
                .then((parsed) => {
                  if (parsed) messages.push(parsed);
                  pending--;
                  if (pending === 0) resolve(messages);
                })
                .catch((parseErr) => {
                  this.logger.warn(`Failed to parse message uid=${uid}: ${parseErr.message}`);
                  pending--;
                  if (pending === 0) resolve(messages);
                });
            });
          });

          fetcher.once('error', (err: Error) => {
            reject(new Error(`Fetch failed: ${err.message}`));
          });

          fetcher.once('end', () => {
            if (pending === 0) resolve(messages);
          });
        });
      });
    });
  }

  async markAsRead(uid: number): Promise<void> {
    if (!this.imap) throw new Error('IMAP not connected');
    return new Promise((resolve, reject) => {
      this.imap.addFlags(uid, ['\\Seen'], (err: Error | null) => {
        if (err) reject(new Error(`Mark as read failed: ${err.message}`));
        else resolve();
      });
    });
  }

  private async parseWithMailparser(
    raw: Buffer,
    uid: number,
  ): Promise<ImapMessage | null> {
    if (!raw || raw.length === 0) return null;

    const parsed: ParsedMail = await simpleParser(raw, {
      skipHtmlToText: false,
      skipTextToHtml: false,
    });

    const from = this.extractSingleAddress(parsed.from);
    if (!from.address) return null;

    return {
      uid,
      uidValidity: this._uidValidity,
      messageId: parsed.messageId || '',
      from,
      to: this.extractAddressArray(parsed.to),
      cc: parsed.cc ? this.extractAddressArray(parsed.cc) : undefined,
      bcc: parsed.bcc ? this.extractAddressArray(parsed.bcc) : undefined,
      replyTo: parsed.replyTo ? this.extractSingleAddress(parsed.replyTo) : undefined,
      subject: parsed.subject || '(no subject)',
      text: parsed.text || undefined,
      html: (typeof parsed.html === 'string' ? parsed.html : undefined) || parsed.text || undefined,
      date: parsed.date || new Date(),
      inReplyTo: parsed.inReplyTo || undefined,
      references: parsed.references && Array.isArray(parsed.references)
        ? parsed.references
        : undefined,
      headers: this.extractHeaders(raw),
      attachments: this.extractAttachments(parsed),
      isRead: false,
    };
  }

  private extractSingleAddress(
    obj: AddressObject | AddressObject[] | undefined,
  ): { address: string; name?: string } {
    if (!obj) return { address: '' };
    const addrObj = Array.isArray(obj) ? obj[0] : obj;
    if (!addrObj?.value || addrObj.value.length === 0) return { address: '' };
    const first = addrObj.value[0];
    return {
      address: first?.address || '',
      name: first?.name || undefined,
    };
  }

  private extractAddressArray(
    obj: AddressObject | AddressObject[] | undefined,
  ): Array<{ address: string; name?: string }> {
    if (!obj) return [];
    const list = Array.isArray(obj) ? obj : [obj];
    const result: Array<{ address: string; name?: string }> = [];
    for (const addrObj of list) {
      if (addrObj?.value) {
        for (const a of addrObj.value) {
          if (a?.address) {
            result.push({ address: a.address, name: a.name || undefined });
          }
        }
      }
    }
    return result;
  }

  private extractHeaders(raw: Buffer): Record<string, string> {
    const headers: Record<string, string> = {};
    const str = raw.toString('utf8');
    const headerEnd = str.indexOf('\r\n\r\n');
    if (headerEnd === -1) return headers;

    const headerBlock = str.substring(0, headerEnd);
    const lines = headerBlock.split(/\r\n/);
    let currentKey = '';

    for (const line of lines) {
      if (/^\s/.test(line) && currentKey) {
        headers[currentKey] += ' ' + line.trim();
      } else {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          currentKey = line.substring(0, colonIdx).trim().toLowerCase();
          headers[currentKey] = line.substring(colonIdx + 1).trim();
        }
      }
    }

    return headers;
  }

  private extractAttachments(parsed: ParsedMail): ImapAttachment[] {
    if (!parsed.attachments || parsed.attachments.length === 0) return [];

    return parsed.attachments.map((att) => ({
      filename: att.filename || 'unnamed',
      contentType: att.contentType || 'application/octet-stream',
      size: att.size,
      content: att.content,
      contentId: att.contentId || undefined,
      inline: att.contentDisposition === 'inline' || false,
    }));
  }
}
