import type { Comment as PrismaComment, Post as PrismaPost } from '@prisma/client';
import { Post, type PostSnapshot, type PostStatus } from '../../domain/post.js';

export type PrismaPostWithComments = PrismaPost & { comments: PrismaComment[] };

/**
 * The only place that knows both shapes. The aggregate never sees a Prisma
 * type, and Prisma never sees a domain object.
 */
export const PostMapper = {
  toDomain(row: PrismaPostWithComments): Post {
    return Post.restore({
      id: row.id,
      title: row.title,
      slug: row.slug,
      body: row.body,
      status: row.status as PostStatus,
      authorId: row.authorId,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      comments: row.comments.map((comment) => ({
        id: comment.id,
        postId: comment.postId,
        authorName: comment.authorName,
        body: comment.body,
        createdAt: comment.createdAt,
      })),
    });
  },

  toPersistence(snapshot: PostSnapshot) {
    return {
      id: snapshot.id,
      title: snapshot.title,
      slug: snapshot.slug,
      body: snapshot.body,
      status: snapshot.status,
      authorId: snapshot.authorId,
      publishedAt: snapshot.publishedAt,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    };
  },
};
