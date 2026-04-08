import { Injectable, Logger } from '@nestjs/common';
import { google, gmail_v1 } from 'googleapis';
import { randomUUID } from 'crypto';
import {
  IEmailIngestPort,
  RawEmail,
  EmailStatus,
  RawEmailAttachment,
} from '@mailverwerkings/email-domain';
import { GmailConfig } from './gmail-config.interface';

@Injectable()
export class GmailAdapter implements IEmailIngestPort {
  private readonly logger = new Logger(GmailAdapter.name);

  constructor(private readonly config: GmailConfig) {}

  async fetchUnseenEmails(): Promise<RawEmail[]> {
    const gmail = this.createGmailClient();
    const limit = this.config.fetchLimit ?? 50;
    const labelIds = this.config.labelIds ?? ['INBOX', 'UNREAD'];

    this.logger.log(`Fetching unread emails from Gmail mailbox: ${this.config.mailboxId}`);

    // List unread messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      labelIds,
      maxResults: limit,
      q: 'is:unread',
    });

    const messageStubs = listResponse.data.messages ?? [];
    if (messageStubs.length === 0) {
      this.logger.debug('No unread messages found');
      return [];
    }

    this.logger.log(`Found ${messageStubs.length} unread message(s)`);

    const emails: RawEmail[] = [];
    for (const stub of messageStubs) {
      if (!stub.id) continue;
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: stub.id,
          format: 'full',
        });
        const email = this.mapMessageToRawEmail(detail.data);
        emails.push(email);
      } catch (error) {
        this.logger.error(`Failed to fetch message id=${stub.id}`, error);
      }
    }

    return emails;
  }

  async markAsSeen(messageId: string): Promise<void> {
    const gmail = this.createGmailClient();

    try {
      // Find the Gmail message id by the RFC Message-ID header
      const searchResponse = await gmail.users.messages.list({
        userId: 'me',
        q: `rfc822msgid:${messageId}`,
        maxResults: 1,
      });

      const messages = searchResponse.data.messages ?? [];
      if (messages.length === 0) {
        this.logger.warn(`No Gmail message found for Message-ID: ${messageId}`);
        return;
      }

      const gmailId = messages[0].id;
      if (!gmailId) return;

      // Remove the UNREAD label
      await gmail.users.messages.modify({
        userId: 'me',
        id: gmailId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });

      this.logger.debug(`Marked message as read: ${messageId}`);
    } catch (error) {
      this.logger.error(`Failed to mark message as read: ${messageId}`, error);
      throw error;
    }
  }

  private createGmailClient(): gmail_v1.Gmail {
    const oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri,
    );

    oauth2Client.setCredentials({
      access_token: this.config.accessToken,
      refresh_token: this.config.refreshToken,
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  private mapMessageToRawEmail(message: gmail_v1.Schema$Message): RawEmail {
    const headers = this.extractHeaders(message.payload?.headers ?? []);

    const messageId =
      headers['message-id']?.replace(/[<>]/g, '') ??
      message.id ??
      randomUUID();

    const subject = headers['subject'] ?? '(no subject)';
    const fromAddress = headers['from'] ?? '';
    const toAddress = headers['to'] ?? '';

    const dateStr = headers['date'];
    const receivedAt = dateStr ? new Date(dateStr) : new Date();

    const { body, htmlBody } = this.extractBody(message.payload);
    const attachments = this.extractAttachments(message.payload);

    return RawEmail.create({
      id: randomUUID(),
      mailboxId: this.config.mailboxId,
      messageId,
      subject,
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

  private extractHeaders(
    rawHeaders: gmail_v1.Schema$MessagePartHeader[],
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const header of rawHeaders) {
      if (header.name && header.value) {
        result[header.name.toLowerCase()] = header.value;
      }
    }
    return result;
  }

  private extractBody(
    payload: gmail_v1.Schema$MessagePart | undefined,
  ): { body: string; htmlBody?: string } {
    if (!payload) return { body: '(no body)' };

    let body = '';
    let htmlBody: string | undefined;

    const walk = (part: gmail_v1.Schema$MessagePart): void => {
      const mimeType = part.mimeType ?? '';

      if (mimeType === 'text/plain' && part.body?.data) {
        body = this.decodeBase64Url(part.body.data);
      } else if (mimeType === 'text/html' && part.body?.data) {
        htmlBody = this.decodeBase64Url(part.body.data);
      }

      if (part.parts) {
        for (const child of part.parts) {
          walk(child);
        }
      }
    };

    walk(payload);

    return { body: body || '(no text body)', htmlBody };
  }

  private extractAttachments(
    payload: gmail_v1.Schema$MessagePart | undefined,
  ): RawEmailAttachment[] {
    if (!payload) return [];

    const attachments: RawEmailAttachment[] = [];

    const walk = (part: gmail_v1.Schema$MessagePart): void => {
      const filename = part.filename;
      const isAttachment =
        filename && filename.length > 0 && part.body?.attachmentId;

      if (isAttachment) {
        attachments.push({
          filename,
          contentType: part.mimeType ?? 'application/octet-stream',
          size: part.body?.size ?? 0,
          contentId: this.findHeader(part.headers ?? [], 'content-id'),
        });
      }

      if (part.parts) {
        for (const child of part.parts) {
          walk(child);
        }
      }
    };

    walk(payload);
    return attachments;
  }

  private findHeader(
    headers: gmail_v1.Schema$MessagePartHeader[],
    name: string,
  ): string | undefined {
    return headers.find((h) => h.name?.toLowerCase() === name)?.value ?? undefined;
  }

  private decodeBase64Url(encoded: string): string {
    // Gmail uses URL-safe base64 encoding
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf8');
  }
}
