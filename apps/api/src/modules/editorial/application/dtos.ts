export interface CreatePostInput {
  title: string;
  body: string;
  authorId: string;
}

export interface RevisePostInput {
  title?: string;
  body?: string;
}

export interface AddCommentInput {
  authorName: string;
  body: string;
}
