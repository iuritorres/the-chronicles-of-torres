import type { UUID } from 'node:crypto';

import type { Author } from '../author.js';

/**
 * Reads the editorial context's own minimal projection of a user. The
 * implementation happens to hit the same database as the auth context today;
 * tomorrow it could be an HTTP call or a replicated table, with no change
 * above this line.
 */
export interface AuthorRepository {
  findById(id: UUID): Promise<Author | null>;
}
