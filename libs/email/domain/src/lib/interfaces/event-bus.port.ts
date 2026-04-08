export interface DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
}

export interface IEventBus {
  /**
   * Publish a domain event to all registered subscribers.
   */
  publish<T extends DomainEvent>(event: T): Promise<void>;

  /**
   * Publish multiple domain events at once.
   */
  publishAll<T extends DomainEvent>(events: T[]): Promise<void>;
}

export const EVENT_BUS_PORT = Symbol('IEventBus');
