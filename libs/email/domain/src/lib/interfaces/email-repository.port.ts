import { RawEmail, EmailStatus } from '../raw-email.entity';

export interface FindEmailsOptions {
  mailboxId?: string;
  status?: EmailStatus;
  limit?: number;
  offset?: number;
}

export interface IEmailRepository {
  /**
   * Persist a new RawEmail entity.
   */
  save(email: RawEmail): Promise<RawEmail>;

  /**
   * Find a RawEmail by its internal id.
   */
  findById(id: string): Promise<RawEmail | null>;

  /**
   * Find a RawEmail by the provider message id.
   */
  findByMessageId(messageId: string): Promise<RawEmail | null>;

  /**
   * Find emails matching the given criteria.
   */
  findMany(options: FindEmailsOptions): Promise<RawEmail[]>;

  /**
   * Update an existing RawEmail entity.
   */
  update(email: RawEmail): Promise<RawEmail>;

  /**
   * Delete a RawEmail by id.
   */
  delete(id: string): Promise<void>;
}

export const EMAIL_REPOSITORY_PORT = Symbol('IEmailRepository');
