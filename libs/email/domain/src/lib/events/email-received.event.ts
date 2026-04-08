import { DomainEvent } from '../interfaces/event-bus.port';

export class EmailReceivedEvent implements DomainEvent {
  readonly eventName = 'email.received';
  readonly occurredAt: Date;
  readonly aggregateId: string;

  constructor(
    public readonly emailId: string,
    public readonly mailboxId: string,
    public readonly messageId: string,
    public readonly fromAddress: string,
    public readonly subject: string,
    public readonly receivedAt: Date,
  ) {
    this.aggregateId = emailId;
    this.occurredAt = new Date();
  }
}
