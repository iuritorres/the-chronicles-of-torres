import type { UniqueEntityId } from '../../../../shared/domain/unique-entity-id.js';
import type { Post } from '../post.js';
import type { Slug } from '../value-objects/slug.js';

/**
 * Write-side contract. Implemented in infrastructure; the domain and the
 * application layer only ever see this interface.
 *
 * `save` persists the whole aggregate — post and comments — as one unit.
 */
export interface PostRepository {
  findById(id: UniqueEntityId): Promise<Post | null>;
  findBySlug(slug: Slug): Promise<Post | null>;
  existsWithSlug(slug: Slug): Promise<boolean>;
  save(post: Post): Promise<void>;
  delete(id: UniqueEntityId): Promise<void>;
}
