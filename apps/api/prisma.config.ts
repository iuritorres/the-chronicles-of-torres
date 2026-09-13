import { defineConfig } from 'prisma/config';
import { env } from './src/config/env.js';

/**
 * Configuration for the Prisma CLI (migrate, studio, db push).
 *
 * Since Prisma 7 the connection URL is no longer allowed in schema.prisma.
 * Migrate reads it from here; the running application never does — it gets a
 * driver adapter instead (see shared/infrastructure/prisma/prisma-client.ts).
 *
 * Reusing the app's own env module means the CLI and the server validate the
 * same variables with the same schema, and a typo fails in one place.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env.DATABASE_URL,
  },
});
