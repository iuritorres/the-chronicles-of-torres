import type { UUID } from 'node:crypto';
import type { Comment as PrismaComment, Post as PrismaPost } from '@prisma/client';
import { Post, type PostSnapshot } from '../../domain/post.js';

export type PrismaPostWithComments = PrismaPost & { comments: PrismaComment[] };

/**
 * The only place that knows both shapes. Prisma never sees a domain object,
 * and the domain borrows nothing from the client but the generated enums, so
 * a row's status needs no cast to become a domain status.
 *
 * Ids are asserted rather than parsed: the column is `@db.Uuid`, so the
 * database already guarantees the format that the type describes.
 */
export const PostMapper = {
  toDomain(row: PrismaPostWithComments): Post {
    return Post.restore({
      id: row.id as UUID,
      title: row.title,
      slug: row.slug,
      body: row.body,
      status: row.status,
      authorId: row.authorId as UUID,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      comments: row.comments.map((comment) => ({
        id: comment.id as UUID,
        postId: comment.postId as UUID,
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
