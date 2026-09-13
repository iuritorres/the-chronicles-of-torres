import { randomUUID } from 'node:crypto';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Identity of an entity. Wrapping the raw string keeps ids from being passed
 * around interchangeably with any other string in the system.
 */
export class UniqueEntityId {
  private constructor(private readonly value: string) {}

  static create(): UniqueEntityId {
    return new UniqueEntityId(randomUUID());
  }

  /** Rehydrates an id that already exists (database row, HTTP param). */
  static restore(value: string): UniqueEntityId {
    if (!UUID_PATTERN.test(value)) {
      throw new InvalidEntityIdError(value);
    }
    return new UniqueEntityId(value);
  }

  equals(other: UniqueEntityId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}

export class InvalidEntityIdError extends Error {
  readonly code = 'INVALID_ENTITY_ID';

  constructor(value: string) {
    super(`"${value}" is not a valid entity id.`);
    this.name = 'InvalidEntityIdError';
  }
}
