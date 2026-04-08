// @mailverwerkings/email-domain public API
export { RawEmail, EmailStatus } from './lib/raw-email.entity';
export type { RawEmailProps, RawEmailAttachment } from './lib/raw-email.entity';

export type { IEmailIngestPort } from './lib/interfaces/email-ingest.port';
export { EMAIL_INGEST_PORT } from './lib/interfaces/email-ingest.port';

export type { IEmailRepository, FindEmailsOptions } from './lib/interfaces/email-repository.port';
export { EMAIL_REPOSITORY_PORT } from './lib/interfaces/email-repository.port';

export type { IEventBus, DomainEvent } from './lib/interfaces/event-bus.port';
export { EVENT_BUS_PORT } from './lib/interfaces/event-bus.port';

export { EmailReceivedEvent } from './lib/events/email-received.event';
