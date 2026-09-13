import type { PrismaClient } from '@prisma/client';
import type {
  PostQueryRepository,
  PublishedPostDetail,
  PublishedPostPage,
} from '../../application/post-query-repository.js';

const EXCERPT_LENGTH = 200;

function excerptOf(body: string): string {
  if (body.length <= EXCERPT_LENGTH) return body;
  return `${body.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

export class PrismaPostQueryRepository implements PostQueryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Keyset pagination over (publishedAt desc, id desc) — stable under inserts,
   * unlike offset paging, and backed by the index on the same columns.
   */
  async listPublished(params: {
    limit: number;
    cursor?: string | undefined;
  }): Promise<PublishedPostPage> {
    const rows = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: params.limit + 1,
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

    const hasMore = rows.length > params.limit;
    const page = hasMore ? rows.slice(0, params.limit) : rows;

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

  async findPublishedBySlug(slug: string): Promise<PublishedPostDetail | null> {
    const row = await this.prisma.post.findFirst({
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
}
