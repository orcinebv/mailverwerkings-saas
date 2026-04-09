import { Injectable, Logger } from '@nestjs/common';
import { ImapFlow, FetchMessageObject, MessageStructureObject } from 'imapflow';
import { randomUUID } from 'crypto';
import {
  IEmailIngestPort,
  RawEmail,
  EmailStatus,
  RawEmailAttachment,
} from '@mailverwerkings/email-domain';
import { ImapConfig } from './imap-config.interface';

@Injectable()
export class ImapAdapter implements IEmailIngestPort {
  private readonly logger = new Logger(ImapAdapter.name);

  constructor(private readonly config: ImapConfig) {}

  async fetchUnseenEmails(): Promise<RawEmail[]> {
    const client = this.createClient();
    const emails: RawEmail[] = [];
    const folder = this.config.folder ?? 'INBOX';
    const limit = this.config.fetchLimit ?? 50;

    try {
      await client.connect();
      this.logger.log(`Connected to IMAP server: ${this.config.host}`);

      const lock = await client.getMailboxLock(folder);
      try {
        // Search for unseen messages
        const uids = await client.search({ seen: false }, { uid: true });

        if (uids.length === 0) {
          this.logger.debug('No unseen messages found');
          return [];
        }

        const fetchUids = uids.slice(0, limit);
        this.logger.log(
          `Fetching ${fetchUids.length} unseen message(s) from ${folder}`,
        );

        for await (const message of client.fetch(
          fetchUids,
          {
            uid: true,
            envelope: true,
            bodyStructure: true,
            source: true,
            headers: true,
          },
          { uid: true },
        )) {
          try {
            const email = this.mapMessageToRawEmail(message);
            emails.push(email);
          } catch (error) {
            this.logger.error(
              `Failed to map message uid=${message.uid}`,
              error,
            );
          }
        }
      } finally {
        lock.release();
      }
    } catch (error) {
      this.logger.error('IMAP fetch error', error);
      throw error;
    } finally {
      await client.logout();
    }

    return emails;
  }

  async markAsSeen(messageId: string): Promise<void> {
    const client = this.createClient();
    const folder = this.config.folder ?? 'INBOX';

    try {
      await client.connect();

      const lock = await client.getMailboxLock(folder);
      try {
        // Search by Message-ID header
        const uids = await client.search(
          { header: { 'message-id': messageId } },
          { uid: true },
        );

        if (uids.length > 0) {
          await client.messageFlagsAdd(uids, ['\\Seen'], { uid: true });
          this.logger.debug(`Marked message as seen: ${messageId}`);
        }
      } finally {
        lock.release();
      }
    } catch (error) {
      this.logger.error(`Failed to mark message as seen: ${messageId}`, error);
      throw error;
    } finally {
      await client.logout();
    }
  }

  private createClient(): ImapFlow {
    return new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.tls,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
      logger: false,
    });
  }

  private mapMessageToRawEmail(message: FetchMessageObject): RawEmail {
    const envelope = message.envelope;
    const headers = this.parseHeaders(message.headers);

    const messageId =
      envelope?.messageId?.replace(/[<>]/g, '') ??
      headers['message-id']?.replace(/[<>]/g, '') ??
      randomUUID();

    const fromAddress = envelope?.from?.[0]
      ? `${envelope.from[0].name ? envelope.from[0].name + ' ' : ''}<${envelope.from[0].address}>`
      : headers['from'] ?? '';

    const toAddressList = envelope?.to ?? [];
    const toAddress =
      toAddressList.length > 0
        ? toAddressList
            .map((a) =>
              a.name ? `${a.name} <${a.address}>` : (a.address ?? ''),
            )
            .join(', ')
        : headers['to'] ?? '';

    const receivedAt =
      envelope?.date instanceof Date ? envelope.date : new Date();

    const attachments = this.extractAttachments(message.bodyStructure);

    // Extract plain text body from source
    const source = message.source?.toString('utf8') ?? '';
    const { body, htmlBody } = this.extractBodyParts(source);

    return RawEmail.create({
      id: randomUUID(),
      mailboxId: this.config.mailboxId,
      messageId,
      subject: envelope?.subject ?? '(no subject)',
      fromAddress,
      toAddress,
      body,
      htmlBody,
      receivedAt,
      status: EmailStatus.RECEIVED,
      headers,
      attachments,
    });
  }

  private parseHeaders(
    raw: Buffer | Map<string, string[]> | undefined,
  ): Record<string, string> {
    if (!raw) return {};

    // imapflow returns headers as a Map<string, string[]>
    if (raw instanceof Map) {
      const result: Record<string, string> = {};
      for (const [key, values] of raw.entries()) {
        result[key.toLowerCase()] = values.join(', ');
      }
      return result;
    }

    // Fallback: parse raw buffer
    const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
    const result: Record<string, string> = {};
    const lines = text.split(/\r?\n/);

    let currentKey = '';
    for (const line of lines) {
      if (!line.trim()) break; // End of headers
      if (/^\s/.test(line)) {
        // Continuation line
        if (currentKey) {
          result[currentKey] = (result[currentKey] ?? '') + ' ' + line.trim();
        }
      } else {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          currentKey = line.slice(0, colonIdx).toLowerCase().trim();
          result[currentKey] = line.slice(colonIdx + 1).trim();
        }
      }
    }
    return result;
  }

  private extractBodyParts(source: string): {
    body: string;
    htmlBody?: string;
  } {
    let body = '';
    let htmlBody: string | undefined;

    // Simple boundary-based MIME parser
    const boundaryMatch = source.match(/boundary="?([^"\r\n;]+)"?/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const parts = source.split(`--${boundary}`);

      for (const part of parts) {
        if (part.startsWith('--') || !part.trim()) continue;

        const headerBodySplit = part.indexOf('\r\n\r\n');
        if (headerBodySplit === -1) continue;

        const partHeaders = part.slice(0, headerBodySplit).toLowerCase();
        const partBody = part.slice(headerBodySplit + 4);

        if (
          partHeaders.includes('content-type: text/plain') ||
          partHeaders.includes('content-type:text/plain')
        ) {
          body = partBody.trim();
        } else if (
          partHeaders.includes('content-type: text/html') ||
          partHeaders.includes('content-type:text/html')
        ) {
          htmlBody = partBody.trim();
        }
      }
    } else {
      // Non-multipart: find the body after double CRLF
      const bodyStart = source.indexOf('\r\n\r\n');
      if (bodyStart !== -1) {
        const contentTypeMatch = source
          .slice(0, bodyStart)
          .match(/content-type:\s*([^;\r\n]+)/i);
        const contentType = contentTypeMatch?.[1]?.toLowerCase().trim() ?? '';

        const rawBody = source.slice(bodyStart + 4).trim();
        if (contentType.includes('text/html')) {
          htmlBody = rawBody;
        } else {
          body = rawBody;
        }
      } else {
        body = source;
      }
    }

    return { body: body || '(no text body)', htmlBody };
  }

  private extractAttachments(
    structure: MessageStructureObject | undefined,
  ): RawEmailAttachment[] {
    if (!structure) return [];
    const attachments: RawEmailAttachment[] = [];
    this.walkStructure(structure, attachments);
    return attachments;
  }

  private walkStructure(
    part: MessageStructureObject,
    attachments: RawEmailAttachment[],
  ): void {
    if (
      part.disposition === 'attachment' ||
      part.disposition === 'inline' && part.dispositionParameters?.filename
    ) {
      attachments.push({
        filename:
          part.dispositionParameters?.filename ??
          part.parameters?.name ??
          'unknown',
        contentType: part.type
          ? `${part.type}/${part.subtype ?? ''}`
          : 'application/octet-stream',
        size: part.size ?? 0,
        contentId: part.id ?? undefined,
      });
    }

    if (Array.isArray(part.childNodes)) {
      for (const child of part.childNodes) {
        this.walkStructure(child, attachments);
      }
    }
  }
}
