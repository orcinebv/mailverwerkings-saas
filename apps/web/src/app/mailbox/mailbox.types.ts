export type MailboxProvider = 'gmail' | 'outlook' | 'imap';
export type MailboxStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface Mailbox {
  id: string;
  email: string;
  provider: MailboxProvider;
  status: MailboxStatus;
  lastSyncAt: string | null;
  createdAt: string;
}

export interface ConnectMailboxInput {
  email: string;
  provider: MailboxProvider;
}
