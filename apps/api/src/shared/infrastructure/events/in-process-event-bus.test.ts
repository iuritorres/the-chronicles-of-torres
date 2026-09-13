import type { FastifyBaseLogger } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import type { DomainEvent } from '../../domain/domain-event.js';
import { InProcessDomainEventBus } from './in-process-event-bus.js';

function silentLogger(): FastifyBaseLogger {
  return { info: vi.fn(), error: vi.fn() } as unknown as FastifyBaseLogger;
}

function anEvent(name: string): DomainEvent {
  return {
    name,
    aggregateId: 'post-1',
    occurredAt: new Date(),
    payload: { slug: 'hello-world' },
  };
}

describe('InProcessDomainEventBus', () => {
  it('delivers an event to the handler subscribed to its name', async () => {
    const bus = new InProcessDomainEventBus(silentLogger());
    const handler = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('editorial.post.published', handler);
    await bus.publishAll([anEvent('editorial.post.published')]);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]?.[0]).toMatchObject({
      name: 'editorial.post.published',
      payload: { slug: 'hello-world' },
    });
  });

  it('delivers one event to every handler subscribed to it', async () => {
    const bus = new InProcessDomainEventBus(silentLogger());
    const audit = vi.fn().mockResolvedValue(undefined);
    const analytics = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('editorial.post.published', audit);
    bus.subscribe('editorial.post.published', analytics);
    await bus.publishAll([anEvent('editorial.post.published')]);

    expect(audit).toHaveBeenCalledOnce();
    expect(analytics).toHaveBeenCalledOnce();
  });

  it('ignores handlers subscribed to a different event', async () => {
    const bus = new InProcessDomainEventBus(silentLogger());
    const other = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('auth.user.created', other);
    await bus.publishAll([anEvent('editorial.post.published')]);

    expect(other).not.toHaveBeenCalled();
  });

  it('keeps going when a handler throws, and does not reject', async () => {
    // The emitting operation is already persisted by the time handlers run:
    // a failing reaction must not fail the request that caused it.
    const logger = silentLogger();
    const bus = new InProcessDomainEventBus(logger);
    const failing = vi.fn().mockRejectedValue(new Error('boom'));
    const healthy = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('editorial.post.published', failing);
    bus.subscribe('editorial.post.published', healthy);

    await expect(
      bus.publishAll([anEvent('editorial.post.published')]),
    ).resolves.toBeUndefined();

    expect(healthy).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
