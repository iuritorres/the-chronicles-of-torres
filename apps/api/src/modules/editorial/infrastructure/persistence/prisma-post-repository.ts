import { Prisma, type PrismaClient } from '@prisma/client';
import type { UniqueEntityId } from '../../../../shared/domain/unique-entity-id.js';
import { SlugAlreadyTakenError } from '../../domain/errors.js';
import type { Post } from '../../domain/post.js';
import type { PostRepository } from '../../domain/repositories/post-repository.js';
import type { Slug } from '../../domain/value-objects/slug.js';
import { PostMapper } from './post-mapper.js';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

export class PrismaPostRepository implements PostRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: UniqueEntityId): Promise<Post | null> {
    const row = await this.prisma.post.findUnique({
      where: { id: id.toString() },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });

    return row ? PostMapper.toDomain(row) : null;
  }

  async findBySlug(slug: Slug): Promise<Post | null> {
    const row = await this.prisma.post.findUnique({
      where: { slug: slug.value },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });

    return row ? PostMapper.toDomain(row) : null;
  }

  async existsWithSlug(slug: Slug): Promise<boolean> {
    const found = await this.prisma.post.findUnique({
      where: { slug: slug.value },
      select: { id: true },
    });

    return found !== null;
  }

  /**
   * Persists the aggregate as one unit: the post row plus the exact set of
   * comments the aggregate currently holds. Comments removed in memory are
   * deleted here, which is what makes `post.removeComment()` durable without
   * a repository of its own.
   */
  async save(post: Post): Promise<void> {
    const snapshot = post.toSnapshot();
    const data = PostMapper.toPersistence(snapshot);
    const keptCommentIds = snapshot.comments.map((comment) => comment.id);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.post.upsert({
          where: { id: snapshot.id },
          create: data,
          update: data,
        });

        await tx.comment.deleteMany({
          where:
            keptCommentIds.length === 0
              ? { postId: snapshot.id }
              : { postId: snapshot.id, id: { notIn: keptCommentIds } },
        });

        for (const comment of snapshot.comments) {
          await tx.comment.upsert({
            where: { id: comment.id },
            create: {
              id: comment.id,
              postId: comment.postId,
              authorName: comment.authorName,
              body: comment.body,
              createdAt: comment.createdAt,
            },
            update: {
              authorName: comment.authorName,
              body: comment.body,
            },
          });
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        // The unique index is the authority on slug collisions; translate it
        // back into the domain's own vocabulary.
        throw new SlugAlreadyTakenError(snapshot.slug);
      }
      throw error;
    }
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await this.prisma.post.delete({ where: { id: id.toString() } });
  }
}
