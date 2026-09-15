import { randomUUID, type UUID } from 'node:crypto';
import { PostStatus } from '@prisma/client';
import type {
  DomainEvent,
  EmitsDomainEvents,
} from '../../../shared/domain/domain-event.js';
import type { Actor } from './actor.js';
import type { Author } from './author.js';
import { Comment, type CommentSnapshot } from './comment.js';
import {
  CommentNotFoundError,
  CommentsClosedError,
  EmptyPostBodyError,
  ForbiddenPostActionError,
  InvalidPostTitleError,
  InvalidSlugError,
  PostAlreadyPublishedError,
  PostNotPublishableError,
} from './errors.js';
import { PostPublished } from './events/post-published.js';

const MAX_TITLE_LENGTH = 140;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A draft can be any length, but the platform publishes long-form writing:
 * anything shorter than this is a note, not an article.
 */
const MIN_PUBLISHABLE_BODY_LENGTH = 500;

export interface PostSnapshot {
  id: UUID;
  title: string;
  slug: string;
  body: string;
  status: PostStatus;
  authorId: UUID;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comments: CommentSnapshot[];
}

interface PostProps {
  title: string;
  slug: string;
  body: string;
  status: PostStatus;
  authorId: UUID;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comments: Comment[];
}

/**
 * The editorial context's central entity.
 *
 * Every state change goes through a method that names a business intent; there
 * are no setters. The constructor is private, so every path that produces a
 * Post runs the same normalisation — an invalid Post cannot exist in memory.
 *
 * Comments are owned here: there is no way to reach one except through the
 * post it belongs to, which is what lets `addComment` refuse a draft.
 */
export class Post implements EmitsDomainEvents {
  #events: DomainEvent[] = [];

  private constructor(
    readonly id: UUID,
    private readonly props: PostProps,
  ) {}

  static draft(input: { title: string; body: string; author: Author }): Post {
    const title = Post.normalizeTitle(input.title);
    const now = new Date();

    return new Post(randomUUID(), {
      title,
      slug: Post.slugify(title),
      body: Post.normalizeBody(input.body),
      status: PostStatus.DRAFT,
      authorId: input.author.id,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      comments: [],
    });
  }

  static restore(snapshot: PostSnapshot): Post {
    return new Post(snapshot.id, {
      title: snapshot.title,
      slug: snapshot.slug,
      body: snapshot.body,
      status: snapshot.status,
      authorId: snapshot.authorId,
      publishedAt: snapshot.publishedAt,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
      comments: snapshot.comments.map((comment) => Comment.restore(comment)),
    });
  }

  publish(actor: Actor): void {
    this.assertCanManage(actor);

    if (this.props.status === PostStatus.PUBLISHED) {
      throw new PostAlreadyPublishedError(this.id);
    }
    if (this.props.status === PostStatus.ARCHIVED) {
      throw new PostNotPublishableError(
        this.id,
        'an archived post must be restored to draft first',
      );
    }
    if (this.props.body.length < MIN_PUBLISHABLE_BODY_LENGTH) {
      throw new PostNotPublishableError(
        this.id,
        `the body has ${this.props.body.length} characters and the minimum is ${MIN_PUBLISHABLE_BODY_LENGTH}`,
      );
    }

    const publishedAt = new Date();
    this.props.status = PostStatus.PUBLISHED;
    this.props.publishedAt = publishedAt;
    this.touch(publishedAt);

    this.#events.push(
      new PostPublished(this.id, publishedAt, {
        slug: this.props.slug,
        authorId: this.props.authorId,
      }),
    );
  }

  archive(actor: Actor): void {
    this.assertCanManage(actor);

    if (this.props.status === PostStatus.ARCHIVED) return;

    this.props.status = PostStatus.ARCHIVED;
    this.touch();
  }

  restoreToDraft(actor: Actor): void {
    this.assertCanManage(actor);

    if (this.props.status === PostStatus.DRAFT) return;

    this.props.status = PostStatus.DRAFT;
    this.props.publishedAt = null;
    this.touch();
  }

  revise(input: { title?: string; body?: string }, actor: Actor): void {
    this.assertCanManage(actor);

    if (input.title !== undefined) {
      this.props.title = Post.normalizeTitle(input.title);

      // Once published, the slug is a public address: renaming the post must
      // not break inbound links. Drafts have no audience yet, so their slug
      // follows the title.
      if (this.props.status === PostStatus.DRAFT) {
        this.props.slug = Post.slugify(this.props.title);
      }
    }

    if (input.body !== undefined) {
      this.props.body = Post.normalizeBody(input.body);
    }

    this.touch();
  }

  addComment(input: { authorName: string; body: string }): Comment {
    if (this.props.status !== PostStatus.PUBLISHED) {
      throw new CommentsClosedError(this.id);
    }

    const comment = Comment.create({
      postId: this.id,
      authorName: input.authorName,
      body: input.body,
    });

    this.props.comments.push(comment);
    this.touch();

    return comment;
  }

  removeComment(commentId: UUID, actor: Actor): void {
    this.assertCanManage(actor);

    const index = this.props.comments.findIndex(
      (comment) => comment.id === commentId,
    );

    if (index === -1) {
      throw new CommentNotFoundError(commentId);
    }

    this.props.comments.splice(index, 1);
    this.touch();
  }

  pullEvents(): DomainEvent[] {
    const events = this.#events;
    this.#events = [];
    return events;
  }

  get title(): string {
    return this.props.title;
  }

  get slug(): string {
    return this.props.slug;
  }

  get body(): string {
    return this.props.body;
  }

  get status(): PostStatus {
    return this.props.status;
  }

  get authorId(): UUID {
    return this.props.authorId;
  }

  get publishedAt(): Date | null {
    return this.props.publishedAt;
  }

  get comments(): readonly Comment[] {
    return this.props.comments;
  }

  toSnapshot(): PostSnapshot {
    return {
      id: this.id,
      title: this.props.title,
      slug: this.props.slug,
      body: this.props.body,
      status: this.props.status,
      authorId: this.props.authorId,
      publishedAt: this.props.publishedAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      comments: this.props.comments.map((comment) => comment.toSnapshot()),
    };
  }

  /** Authors manage the posts they wrote; editors and admins manage all. */
  private assertCanManage(actor: Actor): void {
    if (actor.canModerate()) return;
    if (actor.id === this.props.authorId) return;

    throw new ForbiddenPostActionError(actor.id, this.id);
  }

  private touch(at: Date = new Date()): void {
    this.props.updatedAt = at;
  }

  private static normalizeTitle(raw: string): string {
    const value = raw.trim().replace(/\s+/g, ' ');

    if (value.length === 0) {
      throw new InvalidPostTitleError('A post title cannot be empty.');
    }
    if (value.length > MAX_TITLE_LENGTH) {
      throw new InvalidPostTitleError(
        `A post title must be at most ${MAX_TITLE_LENGTH} characters, got ${value.length}.`,
      );
    }
    return value;
  }

  private static normalizeBody(raw: string): string {
    const value = raw.trim();

    if (value.length === 0) {
      throw new EmptyPostBodyError();
    }
    return value;
  }

  private static slugify(title: string): string {
    const value = title
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .trim()
      .replace(/[\s-]+/g, '-');

    if (!SLUG_PATTERN.test(value)) {
      throw new InvalidSlugError(title);
    }
    return value;
  }
}
