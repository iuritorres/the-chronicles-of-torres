import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { UniqueEntityId } from '../../../shared/domain/unique-entity-id.js';
import type { Actor } from './actor.js';
import type { Author } from './author.js';
import { Comment, type CommentSnapshot } from './comment.js';
import {
  CommentNotFoundError,
  CommentsClosedError,
  ForbiddenPostActionError,
  PostAlreadyPublishedError,
  PostNotPublishableError,
} from './errors.js';
import { PostPublished } from './events/post-published.js';
import { PostBody } from './value-objects/post-body.js';
import { PostTitle } from './value-objects/post-title.js';
import { Slug } from './value-objects/slug.js';

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface PostSnapshot {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: PostStatus;
  authorId: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comments: CommentSnapshot[];
}

interface PostProps {
  title: PostTitle;
  slug: Slug;
  body: PostBody;
  status: PostStatus;
  authorId: UniqueEntityId;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comments: Comment[];
}

/**
 * Aggregate root of the editorial context.
 *
 * Every state change goes through a method that names a business intent. There
 * are no setters, and there is no way to reach a comment except through the
 * post that owns it.
 */
export class Post extends AggregateRoot {
  private constructor(
    id: UniqueEntityId,
    private readonly props: PostProps,
  ) {
    super(id);
  }

  static draft(input: { title: string; body: string; author: Author }): Post {
    const title = PostTitle.create(input.title);
    const now = new Date();

    return new Post(UniqueEntityId.create(), {
      title,
      slug: Slug.fromTitle(title.value),
      body: PostBody.create(input.body),
      status: 'DRAFT',
      authorId: input.author.id,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      comments: [],
    });
  }

  static restore(snapshot: PostSnapshot): Post {
    return new Post(UniqueEntityId.restore(snapshot.id), {
      title: PostTitle.create(snapshot.title),
      slug: Slug.restore(snapshot.slug),
      body: PostBody.create(snapshot.body),
      status: snapshot.status,
      authorId: UniqueEntityId.restore(snapshot.authorId),
      publishedAt: snapshot.publishedAt,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
      comments: snapshot.comments.map((comment) => Comment.restore(comment)),
    });
  }

  publish(actor: Actor): void {
    this.assertCanManage(actor);

    if (this.props.status === 'PUBLISHED') {
      throw new PostAlreadyPublishedError(this.id.toString());
    }
    if (this.props.status === 'ARCHIVED') {
      throw new PostNotPublishableError(
        this.id.toString(),
        'an archived post must be restored to draft first',
      );
    }
    if (!this.props.body.isLongEnoughToPublish()) {
      throw new PostNotPublishableError(
        this.id.toString(),
        `the body has ${this.props.body.length} characters and the minimum is ${PostBody.MIN_PUBLISHABLE_LENGTH}`,
      );
    }

    const publishedAt = new Date();
    this.props.status = 'PUBLISHED';
    this.props.publishedAt = publishedAt;
    this.touch(publishedAt);

    this.record(
      new PostPublished(this.id.toString(), publishedAt, {
        slug: this.props.slug.value,
        authorId: this.props.authorId.toString(),
      }),
    );
  }

  archive(actor: Actor): void {
    this.assertCanManage(actor);

    if (this.props.status === 'ARCHIVED') return;

    this.props.status = 'ARCHIVED';
    this.touch();
  }

  restoreToDraft(actor: Actor): void {
    this.assertCanManage(actor);

    if (this.props.status === 'DRAFT') return;

    this.props.status = 'DRAFT';
    this.props.publishedAt = null;
    this.touch();
  }

  revise(input: { title?: string; body?: string }, actor: Actor): void {
    this.assertCanManage(actor);

    if (input.title !== undefined) {
      this.props.title = PostTitle.create(input.title);

      // Once published, the slug is a public address: renaming the post must
      // not break inbound links. Drafts have no audience yet, so their slug
      // follows the title.
      if (this.props.status === 'DRAFT') {
        this.props.slug = Slug.fromTitle(this.props.title.value);
      }
    }

    if (input.body !== undefined) {
      this.props.body = PostBody.create(input.body);
    }

    this.touch();
  }

  addComment(input: { authorName: string; body: string }): Comment {
    if (this.props.status !== 'PUBLISHED') {
      throw new CommentsClosedError(this.id.toString());
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

  removeComment(commentId: UniqueEntityId, actor: Actor): void {
    this.assertCanManage(actor);

    const index = this.props.comments.findIndex((comment) =>
      comment.id.equals(commentId),
    );

    if (index === -1) {
      throw new CommentNotFoundError(commentId.toString());
    }

    this.props.comments.splice(index, 1);
    this.touch();
  }

  get title(): string {
    return this.props.title.value;
  }

  get slug(): Slug {
    return this.props.slug;
  }

  get body(): string {
    return this.props.body.value;
  }

  get status(): PostStatus {
    return this.props.status;
  }

  get authorId(): UniqueEntityId {
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
      id: this.id.toString(),
      title: this.props.title.value,
      slug: this.props.slug.value,
      body: this.props.body.value,
      status: this.props.status,
      authorId: this.props.authorId.toString(),
      publishedAt: this.props.publishedAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      comments: this.props.comments.map((comment) => comment.toSnapshot()),
    };
  }

  /** Authors manage the posts they wrote; editors and admins manage all. */
  private assertCanManage(actor: Actor): void {
    if (actor.canModerate()) return;
    if (actor.id.equals(this.props.authorId)) return;

    throw new ForbiddenPostActionError(actor.id.toString(), this.id.toString());
  }

  private touch(at: Date = new Date()): void {
    this.props.updatedAt = at;
  }
}
