import type { UserRole } from '@prisma/client';

/**
 * Whoever the transport layer believes is making the request.
 *
 * Each bounded context translates this into its own notion of an actor — the
 * editorial context turns it into `Actor` — so that no module depends on
 * another module's user entity.
 */
export interface Principal {
  id: string;
  role: UserRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    principal?: Principal;
  }
}
