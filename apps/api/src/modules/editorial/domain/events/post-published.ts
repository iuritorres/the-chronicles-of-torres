import type { DomainEvent } from '../../../../shared/domain/domain-event.js';

export class PostPublished implements DomainEvent {
  readonly name = 'editorial.post.published';
  readonly payload: Readonly<{ slug: string; authorId: string }>;

  constructor(
    readonly aggregateId: string,
    readonly occurredAt: Date,
    props: { slug: string; authorId: string },
  ) {
    this.payload = Object.freeze({ ...props });
  }
}
