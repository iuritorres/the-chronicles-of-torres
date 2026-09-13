/**
 * Something that happened in the domain and that other parts of the system may
 * care about. Emitted by aggregates, dispatched after persistence succeeds.
 */
export interface DomainEvent {
  readonly name: string;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: Readonly<Record<string, unknown>>;
}
