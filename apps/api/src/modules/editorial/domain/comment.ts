import { Entity } from '../../../shared/domain/entity.js';
import { UniqueEntityId } from '../../../shared/domain/unique-entity-id.js';
import { InvalidCommentError } from './errors.js';

const MAX_AUTHOR_NAME_LENGTH = 80;
const MAX_BODY_LENGTH = 2000;

export interface CommentSnapshot {
  id: string;
  postId: string;
  authorName: string;
  body: string;
  createdAt: Date;
}

/**
 * Part of the Post aggregate. It has no repository and no independent
 * lifecycle: it is created, read and removed through the post that owns it.
 */
export class Comment extends Entity {
  private constructor(
    id: UniqueEntityId,
    private readonly props: {
      postId: UniqueEntityId;
      authorName: string;
      body: string;
      createdAt: Date;
    },
  ) {
    super(id);
  }

  static create(input: {
    postId: UniqueEntityId;
    authorName: string;
    body: string;
  }): Comment {
    const authorName = input.authorName.trim().replace(/\s+/g, ' ');
    const body = input.body.trim();

    if (authorName.length === 0 || authorName.length > MAX_AUTHOR_NAME_LENGTH) {
      throw new InvalidCommentError(
        `A comment author name must be between 1 and ${MAX_AUTHOR_NAME_LENGTH} characters.`,
      );
    }
    if (body.length === 0 || body.length > MAX_BODY_LENGTH) {
      throw new InvalidCommentError(
        `A comment body must be between 1 and ${MAX_BODY_LENGTH} characters.`,
      );
    }

    return new Comment(UniqueEntityId.create(), {
      postId: input.postId,
      authorName,
      body,
      createdAt: new Date(),
    });
  }

  static restore(snapshot: CommentSnapshot): Comment {
    return new Comment(UniqueEntityId.restore(snapshot.id), {
      postId: UniqueEntityId.restore(snapshot.postId),
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
      id: this.id.toString(),
      postId: this.props.postId.toString(),
      authorName: this.props.authorName,
      body: this.props.body,
      createdAt: this.props.createdAt,
    };
  }
}
