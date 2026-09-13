import { UniqueEntityId } from '../../../shared/domain/unique-entity-id.js';

/**
 * Minimal projection of a user, owned by the editorial context.
 * Bound to the auth context by id only.
 */
export class Author {
  private constructor(
    readonly id: UniqueEntityId,
    readonly name: string,
  ) {}

  static restore(props: { id: string; name: string }): Author {
    return new Author(UniqueEntityId.restore(props.id), props.name);
  }
}
