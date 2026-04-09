import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IEmailIngestPort,
  EMAIL_INGEST_PORT,
} from '@mailverwerkings/email-domain';
import {
  IEmailRepository,
  EMAIL_REPOSITORY_PORT,
} from '@mailverwerkings/email-domain';
import {
  IEventBus,
  EVENT_BUS_PORT,
} from '@mailverwerkings/email-domain';
import { EmailReceivedEvent } from '@mailverwerkings/email-domain';
import { RawEmail } from '@mailverwerkings/email-domain';

export interface IngestEmailResult {
  ingested: number;
  skipped: number;
  failed: number;
  emails: RawEmail[];
}

@Injectable()
export class IngestEmailUseCase {
  private readonly logger = new Logger(IngestEmailUseCase.name);

  constructor(
    @Inject(EMAIL_INGEST_PORT)
    private readonly emailIngestPort: IEmailIngestPort,

    @Inject(EMAIL_REPOSITORY_PORT)
    private readonly emailRepository: IEmailRepository,

    @Inject(EVENT_BUS_PORT)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(): Promise<IngestEmailResult> {
    this.logger.log('Starting email ingestion');

    const result: IngestEmailResult = {
      ingested: 0,
      skipped: 0,
      failed: 0,
      emails: [],
    };

    let unseenEmails: RawEmail[];
    try {
      unseenEmails = await this.emailIngestPort.fetchUnseenEmails();
      this.logger.log(`Fetched ${unseenEmails.length} unseen emails`);
    } catch (error) {
      this.logger.error('Failed to fetch unseen emails', error);
      throw error;
    }

    for (const email of unseenEmails) {
      try {
        // Skip duplicates that are already in the repository
        const existing = await this.emailRepository.findByMessageId(
          email.messageId,
        );
        if (existing) {
          this.logger.debug(
            `Skipping already-ingested email: ${email.messageId}`,
          );
          result.skipped++;
          continue;
        }

        // Persist the new email
        const saved = await this.emailRepository.save(email);

        // Mark as seen on the provider
        await this.emailIngestPort.markAsSeen(email.messageId);

        // Publish domain event
        const event = new EmailReceivedEvent(
          saved.id,
          saved.mailboxId,
          saved.messageId,
          saved.fromAddress,
          saved.subject,
          saved.receivedAt,
        );
        await this.eventBus.publish(event);

        result.ingested++;
        result.emails.push(saved);
        this.logger.debug(`Ingested email: ${email.messageId}`);
      } catch (error) {
        this.logger.error(
          `Failed to ingest email ${email.messageId}`,
          error,
        );
        result.failed++;
      }
    }

    this.logger.log(
      `Ingestion complete: ${result.ingested} ingested, ` +
        `${result.skipped} skipped, ${result.failed} failed`,
    );

    return result;
  }
}
