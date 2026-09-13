import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from '../../../config/env.js';

/**
 * Since Prisma 7 the client no longer opens its own connection from a URL in
 * the schema: it is handed a driver adapter. The `pg` pool below is the actual
 * database connection, which means pooling, TLS and timeouts are configured
 * with plain node-postgres options rather than Prisma-specific ones.
 */
export function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });
}
