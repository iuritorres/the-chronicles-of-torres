import type { DomainEvent } from '../domain/domain-event.js';

/**
 * Application-level contract for dispatching what the aggregates recorded.
 * Implemented in infrastructure — in-process today, a broker later, without
 * the application layer noticing.
 */
export interface DomainEventBus {
  publishAll(events: readonly DomainEvent[]): Promise<void>;
}
