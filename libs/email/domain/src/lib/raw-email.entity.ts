export enum EmailStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export interface RawEmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
}

export interface RawEmailProps {
  id: string;
  mailboxId: string;
  messageId: string;
  subject: string;
  fromAddress: string;
  toAddress: string;
  body: string;
  htmlBody?: string;
  receivedAt: Date;
  processedAt?: Date;
  status: EmailStatus;
  headers: Record<string, string>;
  attachments: RawEmailAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export class RawEmail {
  readonly id: string;
  readonly mailboxId: string;
  readonly messageId: string;
  readonly subject: string;
  readonly fromAddress: string;
  readonly toAddress: string;
  readonly body: string;
  readonly htmlBody?: string;
  readonly receivedAt: Date;
  processedAt?: Date;
  status: EmailStatus;
  readonly headers: Record<string, string>;
  readonly attachments: RawEmailAttachment[];
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: RawEmailProps) {
    this.id = props.id;
    this.mailboxId = props.mailboxId;
    this.messageId = props.messageId;
    this.subject = props.subject;
    this.fromAddress = props.fromAddress;
    this.toAddress = props.toAddress;
    this.body = props.body;
    this.htmlBody = props.htmlBody;
    this.receivedAt = props.receivedAt;
    this.processedAt = props.processedAt;
    this.status = props.status;
    this.headers = props.headers;
    this.attachments = props.attachments;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  markAsProcessing(): RawEmail {
    this.status = EmailStatus.PROCESSING;
    this.updatedAt = new Date();
    return this;
  }

  markAsProcessed(): RawEmail {
    this.status = EmailStatus.PROCESSED;
    this.processedAt = new Date();
    this.updatedAt = new Date();
    return this;
  }

  markAsFailed(): RawEmail {
    this.status = EmailStatus.FAILED;
    this.updatedAt = new Date();
    return this;
  }

  static create(
    props: Omit<RawEmailProps, 'createdAt' | 'updatedAt' | 'status'> & {
      status?: EmailStatus;
    },
  ): RawEmail {
    const now = new Date();
    return new RawEmail({
      ...props,
      status: props.status ?? EmailStatus.RECEIVED,
      createdAt: now,
      updatedAt: now,
    });
  }
}
