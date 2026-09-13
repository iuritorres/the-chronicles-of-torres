export type PrincipalRole = 'ADMIN' | 'EDITOR' | 'AUTHOR';

/**
 * Whoever the transport layer believes is making the request.
 *
 * Each bounded context translates this into its own notion of an actor — the
 * editorial context turns it into `Actor` — so that no module depends on
 * another module's user entity.
 */
export interface Principal {
  id: string;
  role: PrincipalRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    principal?: Principal;
  }
}
