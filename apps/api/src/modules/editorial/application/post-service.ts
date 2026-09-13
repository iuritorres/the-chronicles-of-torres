import type { UUID } from 'node:crypto';
import type { DomainEventBus } from '../../../shared/application/domain-event-bus.js';
import type { Actor } from '../domain/actor.js';
import {
  AuthorNotFoundError,
  PostNotFoundError,
  SlugAlreadyTakenError,
} from '../domain/errors.js';
import { Post, type PostSnapshot } from '../domain/post.js';
import type { AuthorRepository } from '../domain/repositories/author-repository.js';
import type {
  PostRepository,
  PublishedPostDetail,
  PublishedPostPage,
} from '../domain/repositories/post-repository.js';
import type {
  AddCommentInput,
  CreatePostInput,
  RevisePostInput,
} from './dtos.js';

/**
 * The single door into the editorial context.
 *
 * It decides nothing about the business: it loads the post, calls the method
 * that names the intent, persists, and dispatches whatever the post recorded.
 * Every rule lives one layer below, inside `Post`.
 *
 * Storage concerns it deliberately does not own: pagination limits and
 * database error translation belong to the repository implementation.
 */
export class PostService {
  constructor(
    private readonly posts: PostRepository,
    private readonly authors: AuthorRepository,
    private readonly events: DomainEventBus,
  ) {}

  async create(input: CreatePostInput): Promise<PostSnapshot> {
    const author = await this.authors.findById(input.authorId);
    if (!author) {
      throw new AuthorNotFoundError(input.authorId);
    }

    const post = Post.draft({
      title: input.title,
      body: input.body,
      author,
    });

    // Fast path for a friendly error. The unique index on `posts.slug` is the
    // real guard against the race, and the repository translates its violation
    // into this same error.
    if (await this.posts.existsWithSlug(post.slug)) {
      throw new SlugAlreadyTakenError(post.slug);
    }

    return this.persist(post);
  }

  async revise(
    postId: UUID,
    input: RevisePostInput,
    actor: Actor,
  ): Promise<PostSnapshot> {
    const post = await this.load(postId);
    post.revise(input, actor);

    return this.persist(post);
  }

  async publish(postId: UUID, actor: Actor): Promise<PostSnapshot> {
    const post = await this.load(postId);
    post.publish(actor);

    return this.persist(post);
  }

  async archive(postId: UUID, actor: Actor): Promise<PostSnapshot> {
    const post = await this.load(postId);
    post.archive(actor);

    return this.persist(post);
  }

  async restoreToDraft(postId: UUID, actor: Actor): Promise<PostSnapshot> {
    const post = await this.load(postId);
    post.restoreToDraft(actor);

    return this.persist(post);
  }

  async addComment(slug: string, input: AddCommentInput): Promise<PostSnapshot> {
    const post = await this.posts.findBySlug(slug);
    if (!post) {
      throw new PostNotFoundError(slug);
    }

    post.addComment(input);

    return this.persist(post);
  }

  async removeComment(
    postId: UUID,
    commentId: UUID,
    actor: Actor,
  ): Promise<PostSnapshot> {
    const post = await this.load(postId);
    post.removeComment(commentId, actor);

    return this.persist(post);
  }

  listPublished(params: {
    limit?: number | undefined;
    cursor?: string | undefined;
  }): Promise<PublishedPostPage> {
    return this.posts.listPublished(params);
  }

  async getPublishedBySlug(slug: string): Promise<PublishedPostDetail> {
    const post = await this.posts.findPublishedViewBySlug(slug);
    if (!post) {
      throw new PostNotFoundError(slug);
    }
    return post;
  }

  /**
   * Saves, then dispatches. The order matters: an event must never announce a
   * state that failed to persist.
   */
  private async persist(post: Post): Promise<PostSnapshot> {
    await this.posts.save(post);
    await this.events.publishAll(post.pullEvents());

    return post.toSnapshot();
  }

  private async load(postId: UUID): Promise<Post> {
    const post = await this.posts.findById(postId);
    if (!post) {
      throw new PostNotFoundError(postId);
    }
    return post;
  }
}
