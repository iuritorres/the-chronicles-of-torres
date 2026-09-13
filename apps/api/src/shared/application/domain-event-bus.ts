import type { DomainEvent } from '../domain/domain-event.js';

export type DomainEventHandler = (event: DomainEvent) => Promise<void>;

/**
 * Observer over domain events: entities announce, handlers react, and neither
 * side knows the other exists.
 *
 * Implemented in infrastructure — in-process today, a broker later, without
 * the application layer noticing.
 */
export interface DomainEventBus {
  /**
   * Registers a handler for one event name. Several handlers may listen to the
   * same event; a module that reacts owns its handler.
   */
  subscribe(eventName: string, handler: DomainEventHandler): void;

  publishAll(events: readonly DomainEvent[]): Promise<void>;
}
