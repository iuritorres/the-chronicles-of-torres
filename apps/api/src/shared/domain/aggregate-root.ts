import type { DomainEvent } from './domain-event.js';
import { Entity } from './entity.js';

/**
 * Consistency boundary. Every change to anything inside the aggregate goes
 * through the root, and the whole thing is persisted as one unit.
 */
export abstract class AggregateRoot extends Entity {
  #events: DomainEvent[] = [];

  protected record(event: DomainEvent): void {
    this.#events.push(event);
  }

  /**
   * Hands over the recorded events and clears them, so an aggregate saved
   * twice cannot dispatch the same event twice.
   */
  pullEvents(): DomainEvent[] {
    const events = this.#events;
    this.#events = [];
    return events;
  }
}
