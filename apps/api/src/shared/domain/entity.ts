import type { UniqueEntityId } from './unique-entity-id.js';

/**
 * Anything with a thread of identity: two entities are the same when their ids
 * match, regardless of how many attributes differ.
 */
export abstract class Entity {
  protected constructor(readonly id: UniqueEntityId) {}

  equals(other?: Entity): boolean {
    if (!other) return false;
    if (this === other) return true;
    return this.id.equals(other.id);
  }
}
