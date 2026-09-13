import type { FastifyBaseLogger } from 'fastify';
import type { DomainEventBus } from '../../application/domain-event-bus.js';
import type { DomainEvent } from '../../domain/domain-event.js';

/**
 * Dispatches domain events inside the same process.
 *
 * Today it only logs. It is the seam where the `governance` module will
 * subscribe to write audit entries, and where a real broker would replace the
 * implementation without the application layer noticing.
 */
export class InProcessDomainEventBus implements DomainEventBus {
  constructor(private readonly logger: FastifyBaseLogger) {}

  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      this.logger.info(
        {
          event: event.name,
          aggregateId: event.aggregateId,
          occurredAt: event.occurredAt,
          payload: event.payload,
        },
        'domain event dispatched',
      );
    }
  }
}
