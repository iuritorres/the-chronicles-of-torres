/**
 * Something that happened in the domain and that other parts of the system may
 * care about. Recorded by whoever owns the invariant, dispatched after the
 * change is persisted.
 */
export interface DomainEvent {
  readonly name: string;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * Capability, not inheritance. An entity is free to be shaped however the
 * business needs; declaring this interface only states that it also announces
 * what happened to it.
 *
 * TypeScript is structurally typed, so a class already exposing `pullEvents`
 * satisfies this without an `implements` clause — the clause is written
 * anyway, as documentation of intent.
 */
export interface EmitsDomainEvents {
  /**
   * Hands over the recorded events and clears the buffer, so the same entity
   * saved twice cannot announce the same fact twice.
   */
  pullEvents(): DomainEvent[];
}
