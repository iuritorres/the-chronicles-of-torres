import type { UUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { Author } from '../../domain/author.js';
import type { AuthorRepository } from '../../domain/repositories/author-repository.js';

/**
 * Reads the auth context's `users` table, but exposes only what the editorial
 * context is allowed to know about a person.
 */
export class PrismaAuthorRepository implements AuthorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: UUID): Promise<Author | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    return row ? Author.restore({ id: row.id as UUID, name: row.name }) : null;
  }
}
