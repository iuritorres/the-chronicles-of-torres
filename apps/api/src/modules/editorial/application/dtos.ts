import type { UUID } from 'node:crypto';

export interface CreatePostInput {
  title: string;
  body: string;
  authorId: UUID;
}

export interface RevisePostInput {
  title?: string;
  body?: string;
}

export interface AddCommentInput {
  authorName: string;
  body: string;
}
