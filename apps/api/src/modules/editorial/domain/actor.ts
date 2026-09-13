import { UniqueEntityId } from '../../../shared/domain/unique-entity-id.js';

export type ActorRole = 'ADMIN' | 'EDITOR' | 'AUTHOR';

/**
 * The editorial context's own view of "who is acting".
 *
 * Deliberately not the `User` entity from the auth context: editorial needs
 * an id and a role to decide ownership, and nothing else. Passwords, sessions
 * and OAuth providers are somebody else's problem.
 */
export class Actor {
  private constructor(
    readonly id: UniqueEntityId,
    readonly role: ActorRole,
  ) {}

  static create(props: { id: string; role: ActorRole }): Actor {
    return new Actor(UniqueEntityId.restore(props.id), props.role);
  }

  /** Editors and admins curate anyone's content; authors only their own. */
  canModerate(): boolean {
    return this.role === 'ADMIN' || this.role === 'EDITOR';
  }
}
