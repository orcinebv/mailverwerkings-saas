export interface GmailConfig {
  /** Google OAuth2 client ID */
  clientId: string;

  /** Google OAuth2 client secret */
  clientSecret: string;

  /** OAuth2 redirect URI */
  redirectUri: string;

  /** Current OAuth2 access token */
  accessToken: string;

  /** OAuth2 refresh token used to obtain a new access token */
  refreshToken: string;

  /** Mailbox identifier used to tag ingested emails */
  mailboxId: string;

  /** Maximum number of messages to fetch per run (default: 50) */
  fetchLimit?: number;

  /** Gmail label filter (default: INBOX) */
  labelIds?: string[];
}
