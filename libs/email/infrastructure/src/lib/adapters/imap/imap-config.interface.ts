export interface ImapConfig {
  /** IMAP server hostname */
  host: string;

  /** IMAP server port (usually 993 for TLS, 143 for plain) */
  port: number;

  /** Whether to use TLS/SSL */
  tls: boolean;

  /** IMAP account username */
  user: string;

  /** IMAP account password */
  password: string;

  /** Mailbox identifier used to tag ingested emails */
  mailboxId: string;

  /** IMAP folder to read from (default: INBOX) */
  folder?: string;

  /** Maximum number of messages to fetch per run (default: 50) */
  fetchLimit?: number;
}
