import type { UUID } from 'node:crypto';
import type { Post } from '../post.js';

/**
 * Read models. Listing published posts does not need a hydrated Post with
 * every comment attached — it needs a projection, so the implementation can
 * select exactly the columns the view uses.
 */
export interface PublishedPostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  authorName: string;
  publishedAt: Date;
  commentCount: number;
}

export interface PublishedPostPage {
  items: PublishedPostListItem[];
  nextCursor: string | null;
}

export interface PublishedPostComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: Date;
}

export interface PublishedPostDetail {
  id: string;
  title: string;
  slug: string;
  body: string;
  authorName: string;
  publishedAt: Date;
  comments: PublishedPostComment[];
}

/**
 * Everything the editorial context needs from storage, behind one contract.
 * The domain and the application layer only ever see this interface;
 * infrastructure implements it.
 *
 * `save` persists the whole post — comments included — as one unit, which is
 * what makes `post.removeComment()` durable without a repository of its own.
 *
 * Pagination limits and database error translation live in the
 * implementation: they are storage concerns, not flow rules.
 */
export interface PostRepository {
  findById(id: UUID): Promise<Post | null>;
  findBySlug(slug: string): Promise<Post | null>;
  existsWithSlug(slug: string): Promise<boolean>;
  save(post: Post): Promise<void>;
  delete(id: UUID): Promise<void>;

  listPublished(params: {
    limit?: number | undefined;
    cursor?: string | undefined;
  }): Promise<PublishedPostPage>;

  findPublishedViewBySlug(slug: string): Promise<PublishedPostDetail | null>;
}
