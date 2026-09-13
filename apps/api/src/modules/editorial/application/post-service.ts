import type { DomainEventBus } from '../../../shared/application/domain-event-bus.js';
import { UniqueEntityId } from '../../../shared/domain/unique-entity-id.js';
import type { Actor } from '../domain/actor.js';
import {
  AuthorNotFoundError,
  PostNotFoundError,
  SlugAlreadyTakenError,
} from '../domain/errors.js';
import { Post, type PostSnapshot } from '../domain/post.js';
import type { AuthorRepository } from '../domain/repositories/author-repository.js';
import type { PostRepository } from '../domain/repositories/post-repository.js';
import { Slug } from '../domain/value-objects/slug.js';
import type {
  AddCommentInput,
  CreatePostInput,
  RevisePostInput,
} from './dtos.js';

/**
 * Application service for the Post aggregate — commands only.
 *
 * It decides nothing about the business: it loads the aggregate, calls the
 * method that names the intent, persists, and dispatches whatever the
 * aggregate recorded. Every rule lives one layer below, in `Post`.
 *
 * Reads live in `PostQueryService`, which keeps this class under the
 * seven-method ceiling set in docs/architecture/backend.md.
 */
export class PostService {
  constructor(
    private readonly posts: PostRepository,
    private readonly authors: AuthorRepository,
    private readonly events: DomainEventBus,
  ) {}

  async create(input: CreatePostInput): Promise<PostSnapshot> {
    const author = await this.authors.findById(
      UniqueEntityId.restore(input.authorId),
    );
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
      throw new SlugAlreadyTakenError(post.slug.value);
    }

    return this.persist(post);
  }

  async revise(
    postId: string,
    input: RevisePostInput,
    actor: Actor,
  ): Promise<PostSnapshot> {
    const post = await this.load(postId);
    post.revise(input, actor);

    return this.persist(post);
  }

  async publish(postId: string, actor: Actor): Promise<PostSnapshot> {
    const post = await this.load(postId);
    post.publish(actor);

    return this.persist(post);
  }

  async archive(postId: string, actor: Actor): Promise<PostSnapshot> {
    const post = await this.load(postId);
    post.archive(actor);

    return this.persist(post);
  }

  async restoreToDraft(postId: string, actor: Actor): Promise<PostSnapshot> {
    const post = await this.load(postId);
    post.restoreToDraft(actor);

    return this.persist(post);
  }

  async addComment(slug: string, input: AddCommentInput): Promise<PostSnapshot> {
    const post = await this.loadBySlug(slug);
    post.addComment(input);

    return this.persist(post);
  }

  async removeComment(
    postId: string,
    commentId: string,
    actor: Actor,
  ): Promise<PostSnapshot> {
    const post = await this.load(postId);
    post.removeComment(UniqueEntityId.restore(commentId), actor);

    return this.persist(post);
  }

  /**
   * Saves the aggregate, then dispatches its events. The order matters: an
   * event must never announce a state that failed to persist.
   */
  private async persist(post: Post): Promise<PostSnapshot> {
    await this.posts.save(post);
    await this.events.publishAll(post.pullEvents());

    return post.toSnapshot();
  }

  private async load(postId: string): Promise<Post> {
    const post = await this.posts.findById(UniqueEntityId.restore(postId));
    if (!post) {
      throw new PostNotFoundError(postId);
    }
    return post;
  }

  private async loadBySlug(slug: string): Promise<Post> {
    const post = await this.posts.findBySlug(Slug.restore(slug));
    if (!post) {
      throw new PostNotFoundError(slug);
    }
    return post;
  }
}
