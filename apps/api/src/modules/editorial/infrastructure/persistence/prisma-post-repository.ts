import type { UUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { SlugAlreadyTakenError } from '../../domain/errors.js';
import type { Post } from '../../domain/post.js';
import type {
  PostRepository,
  PublishedPostDetail,
  PublishedPostPage,
} from '../../domain/repositories/post-repository.js';
import { PostMapper } from './post-mapper.js';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const EXCERPT_LENGTH = 200;

/**
 * Either a standalone client or one already scoped to a transaction. Accepting
 * both is what lets the application layer decide the transaction boundary:
 * a single call manages its own, several calls share one.
 */
type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

function excerptOf(body: string): string {
  if (body.length <= EXCERPT_LENGTH) return body;
  return `${body.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

export class PrismaPostRepository implements PostRepository {
  constructor(private readonly db: PrismaExecutor) {}

  /**
   * Returns a repository bound to an open transaction, so a service can run
   * several writes — across repositories — as one unit of work.
   */
  withTransaction(tx: Prisma.TransactionClient): PrismaPostRepository {
    return new PrismaPostRepository(tx);
  }

  async findById(id: UUID): Promise<Post | null> {
    const row = await this.db.post.findUnique({
      where: { id },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });

    return row ? PostMapper.toDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<Post | null> {
    const row = await this.db.post.findUnique({
      where: { slug },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });

    return row ? PostMapper.toDomain(row) : null;
  }

  async existsWithSlug(slug: string): Promise<boolean> {
    const found = await this.db.post.findUnique({
      where: { slug },
      select: { id: true },
    });

    return found !== null;
  }

  /**
   * Persists the post and the exact set of comments it currently holds.
   * Comments removed in memory are deleted here.
   *
   * If this repository already runs inside a transaction, it joins it; if not,
   * it opens one of its own, so a standalone save is still atomic.
   */
  async save(post: Post): Promise<void> {
    const snapshot = post.toSnapshot();

    try {
      if ('$transaction' in this.db) {
        await this.db.$transaction((tx) => this.write(tx, post));
      } else {
        await this.write(this.db, post);
      }
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

  async delete(id: UUID): Promise<void> {
    await this.db.post.delete({ where: { id } });
  }

  /**
   * Keyset pagination over (publishedAt desc, id desc) — stable under inserts,
   * unlike offset paging, and backed by the index on the same columns.
   */
  async listPublished(params: {
    limit?: number | undefined;
    cursor?: string | undefined;
  }): Promise<PublishedPostPage> {
    const limit = Math.min(params.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const rows = await this.db.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        slug: true,
        body: true,
        publishedAt: true,
        createdAt: true,
        author: { select: { name: true } },
        _count: { select: { comments: true } },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: excerptOf(row.body),
        authorName: row.author.name,
        publishedAt: row.publishedAt ?? row.createdAt,
        commentCount: row._count.comments,
      })),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async findPublishedViewBySlug(
    slug: string,
  ): Promise<PublishedPostDetail | null> {
    const row = await this.db.post.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        slug: true,
        body: true,
        publishedAt: true,
        createdAt: true,
        author: { select: { name: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, authorName: true, body: true, createdAt: true },
        },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      body: row.body,
      authorName: row.author.name,
      publishedAt: row.publishedAt ?? row.createdAt,
      comments: row.comments,
    };
  }

  private async write(
    tx: Prisma.TransactionClient,
    post: Post,
  ): Promise<void> {
    const snapshot = post.toSnapshot();
    const data = PostMapper.toPersistence(snapshot);
    const keptCommentIds = snapshot.comments.map((comment) => comment.id);

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
  }
}
