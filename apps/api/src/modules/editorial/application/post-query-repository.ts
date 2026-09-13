/**
 * Read-side contract (CQRS-lite).
 *
 * Listing published posts does not need a hydrated aggregate with every
 * comment attached — it needs a projection. Keeping reads on their own
 * interface lets the implementation select exactly the columns the view uses,
 * and keeps `PostService` focused on commands.
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

export interface PublishedPostPage {
  items: PublishedPostListItem[];
  nextCursor: string | null;
}

export interface PostQueryRepository {
  listPublished(params: {
    limit: number;
    cursor?: string | undefined;
  }): Promise<PublishedPostPage>;

  findPublishedBySlug(slug: string): Promise<PublishedPostDetail | null>;
}
