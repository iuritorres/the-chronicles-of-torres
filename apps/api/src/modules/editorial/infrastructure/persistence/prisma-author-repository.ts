import type { PrismaClient } from '@prisma/client';
import type { UniqueEntityId } from '../../../../shared/domain/unique-entity-id.js';
import { Author } from '../../domain/author.js';
import type { AuthorRepository } from '../../domain/repositories/author-repository.js';

/**
 * Reads the auth context's `users` table, but exposes only what the
 * editorial context is allowed to know about a person.
 */
export class PrismaAuthorRepository implements AuthorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: UniqueEntityId): Promise<Author | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: id.toString() },
      select: { id: true, name: true },
    });

    return row ? Author.restore(row) : null;
  }
}
