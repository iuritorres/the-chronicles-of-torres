import type { FastifyBaseLogger } from 'fastify';
import type {
  DomainEventBus,
  DomainEventHandler,
} from '../../application/domain-event-bus.js';
import type { DomainEvent } from '../../domain/domain-event.js';

/**
 * Dispatches domain events inside the same process.
 *
 * Handlers run after the emitting operation has already been persisted, so a
 * handler that throws must not fail the request that caused it: the fact
 * happened regardless of whether a reaction succeeded. Failures are logged and
 * the remaining handlers still run.
 *
 * That tolerance is also the limitation: a handler that fails here is simply
 * lost. Moving to a broker with an outbox is what turns "logged and dropped"
 * into "retried until it succeeds".
 */
export class InProcessDomainEventBus implements DomainEventBus {
  readonly #handlers = new Map<string, DomainEventHandler[]>();

  constructor(private readonly logger: FastifyBaseLogger) {}

  subscribe(eventName: string, handler: DomainEventHandler): void {
    const registered = this.#handlers.get(eventName) ?? [];
    this.#handlers.set(eventName, [...registered, handler]);
  }

  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.#handlers.get(event.name) ?? [];

      this.logger.info(
        {
          event: event.name,
          aggregateId: event.aggregateId,
          occurredAt: event.occurredAt,
          handlers: handlers.length,
          payload: event.payload,
        },
        'domain event dispatched',
      );

      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          this.logger.error(
            { err: error, event: event.name, aggregateId: event.aggregateId },
            'domain event handler failed',
          );
        }
      }
    }
  }
}
