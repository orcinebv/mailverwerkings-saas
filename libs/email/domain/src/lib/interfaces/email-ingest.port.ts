import { RawEmail } from '../raw-email.entity';

export interface IEmailIngestPort {
  /**
   * Fetch unseen/unread emails from the provider.
   * Returns an array of RawEmail domain entities.
   */
  fetchUnseenEmails(): Promise<RawEmail[]>;

  /**
   * Mark a specific email as read/seen on the provider side.
   */
  markAsSeen(messageId: string): Promise<void>;
}

export const EMAIL_INGEST_PORT = Symbol('IEmailIngestPort');
