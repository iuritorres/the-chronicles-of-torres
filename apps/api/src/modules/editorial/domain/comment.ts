import { randomUUID, type UUID } from 'node:crypto';

import { InvalidCommentError } from './errors.js';

const MAX_AUTHOR_NAME_LENGTH = 80;
const MAX_BODY_LENGTH = 2000;

export interface CommentSnapshot {
  id: UUID;
  postId: UUID;
  authorName: string;
  body: string;
  createdAt: Date;
}

/**
 * Owned by Post. It has no repository and no independent lifecycle: it is
 * created, read and removed through the post that owns it.
 */
export class Comment {
  private constructor(
    readonly id: UUID,
    private readonly props: {
      postId: UUID;
      authorName: string;
      body: string;
      createdAt: Date;
    },
  ) {}

  static create(input: {
    postId: UUID;
    authorName: string;
    body: string;
  }): Comment {
    return new Comment(randomUUID(), {
      postId: input.postId,
      authorName: Comment.normalizeAuthorName(input.authorName),
      body: Comment.normalizeBody(input.body),
      createdAt: new Date(),
    });
  }

  static restore(snapshot: CommentSnapshot): Comment {
    return new Comment(snapshot.id, {
      postId: snapshot.postId,
      authorName: snapshot.authorName,
      body: snapshot.body,
      createdAt: snapshot.createdAt,
    });
  }

  get authorName(): string {
    return this.props.authorName;
  }

  get body(): string {
    return this.props.body;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toSnapshot(): CommentSnapshot {
    return {
      id: this.id,
      postId: this.props.postId,
      authorName: this.props.authorName,
      body: this.props.body,
      createdAt: this.props.createdAt,
    };
  }

  private static normalizeAuthorName(raw: string): string {
    const value = raw.trim().replace(/\s+/g, ' ');

    if (value.length === 0 || value.length > MAX_AUTHOR_NAME_LENGTH) {
      throw new InvalidCommentError(
        `A comment author name must be between 1 and ${MAX_AUTHOR_NAME_LENGTH} characters.`,
      );
    }
    return value;
  }

  private static normalizeBody(raw: string): string {
    const value = raw.trim();

    if (value.length === 0 || value.length > MAX_BODY_LENGTH) {
      throw new InvalidCommentError(
        `A comment body must be between 1 and ${MAX_BODY_LENGTH} characters.`,
      );
    }
    return value;
  }
}
