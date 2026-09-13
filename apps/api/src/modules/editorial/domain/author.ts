import type { UUID } from 'node:crypto';

/**
 * Minimal projection of a user, owned by the editorial context and bound to
 * the auth context by id alone.
 */
export class Author {
  private constructor(
    readonly id: UUID,
    readonly name: string,
  ) {}

  static restore(props: { id: UUID; name: string }): Author {
    return new Author(props.id, props.name);
  }
}
