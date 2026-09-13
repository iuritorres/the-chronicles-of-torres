import { PostNotFoundError } from '../domain/errors.js';
import type {
  PostQueryRepository,
  PublishedPostDetail,
  PublishedPostPage,
} from './post-query-repository.js';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/**
 * Read side of the editorial context. Returns projections, never aggregates:
 * nothing here can mutate state, so nothing here needs an actor.
 */
export class PostQueryService {
  constructor(private readonly posts: PostQueryRepository) {}

  async listPublished(params: {
    limit?: number | undefined;
    cursor?: string | undefined;
  }): Promise<PublishedPostPage> {
    const limit = Math.min(params.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    return this.posts.listPublished({ limit, cursor: params.cursor });
  }

  async getPublishedBySlug(slug: string): Promise<PublishedPostDetail> {
    const post = await this.posts.findPublishedBySlug(slug);
    if (!post) {
      throw new PostNotFoundError(slug);
    }
    return post;
  }
}
