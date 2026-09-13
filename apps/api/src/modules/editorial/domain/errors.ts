import { DomainError } from '../../../shared/domain/domain-error.js';

export class PostNotFoundError extends DomainError {
  readonly code = 'POST_NOT_FOUND';

  constructor(reference: string) {
    super(`Post "${reference}" was not found.`);
  }
}

export class AuthorNotFoundError extends DomainError {
  readonly code = 'AUTHOR_NOT_FOUND';

  constructor(authorId: string) {
    super(`Author "${authorId}" was not found in the editorial context.`);
  }
}

export class SlugAlreadyTakenError extends DomainError {
  readonly code = 'SLUG_ALREADY_TAKEN';

  constructor(slug: string) {
    super(`The slug "${slug}" is already in use by another post.`);
  }
}

export class InvalidPostTitleError extends DomainError {
  readonly code = 'INVALID_POST_TITLE';
}

export class InvalidSlugError extends DomainError {
  readonly code = 'INVALID_SLUG';

  constructor(source: string) {
    super(`"${source}" cannot be turned into a valid slug.`);
  }
}

export class EmptyPostBodyError extends DomainError {
  readonly code = 'EMPTY_POST_BODY';

  constructor() {
    super('A post body cannot be empty.');
  }
}

export class PostAlreadyPublishedError extends DomainError {
  readonly code = 'POST_ALREADY_PUBLISHED';

  constructor(postId: string) {
    super(`Post "${postId}" is already published.`);
  }
}

export class PostNotPublishableError extends DomainError {
  readonly code = 'POST_NOT_PUBLISHABLE';

  constructor(postId: string, reason: string) {
    super(`Post "${postId}" cannot be published: ${reason}.`);
  }
}

export class CommentsClosedError extends DomainError {
  readonly code = 'COMMENTS_CLOSED';

  constructor(postId: string) {
    super(`Post "${postId}" is not published, so it accepts no comments.`);
  }
}

export class CommentNotFoundError extends DomainError {
  readonly code = 'COMMENT_NOT_FOUND';

  constructor(commentId: string) {
    super(`Comment "${commentId}" was not found on this post.`);
  }
}

export class InvalidCommentError extends DomainError {
  readonly code = 'INVALID_COMMENT';
}

export class ForbiddenPostActionError extends DomainError {
  readonly code = 'FORBIDDEN_POST_ACTION';

  constructor(actorId: string, postId: string) {
    super(`Actor "${actorId}" is not allowed to manage post "${postId}".`);
  }
}
