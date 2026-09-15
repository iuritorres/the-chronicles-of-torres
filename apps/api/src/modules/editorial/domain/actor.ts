import type { UUID } from 'node:crypto';
import { UserRole } from '@prisma/client';

/**
 * The editorial context's own view of "who is acting".
 *
 * Deliberately not the `User` entity from the auth context: editorial needs an
 * id and a role to decide ownership, and nothing else. Passwords, sessions and
 * OAuth providers are somebody else's problem.
 */
export class Actor {
  private constructor(
    readonly id: UUID,
    readonly role: UserRole,
  ) {}

  static create(props: { id: UUID; role: UserRole }): Actor {
    return new Actor(props.id, props.role);
  }

  /** Editors and admins curate anyone's content; authors only their own. */
  canModerate(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.EDITOR;
  }
}
