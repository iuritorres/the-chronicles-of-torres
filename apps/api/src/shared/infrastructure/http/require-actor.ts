import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../../config/env.js';
import type { PrincipalRole } from './principal.js';

const ROLES: readonly PrincipalRole[] = ['ADMIN', 'EDITOR', 'AUTHOR'];

/**
 * TEMPORARY DEVELOPMENT STUB — this is not authentication.
 *
 * It trusts two request headers, which any client can set. It exists only so
 * the editorial module can be exercised before the `auth` module (OAuth2 /
 * OIDC, sessions, RBAC) is built.
 *
 * It fails closed: outside development and test it authenticates nobody and
 * answers 501, so deploying the API in this state locks the write endpoints
 * rather than leaving them open.
 *
 * Replace this with the real auth preHandler and delete the file.
 */
export async function requireActor(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') {
    request.log.error(
      'requireActor stub was reached outside development: the auth module is not implemented yet.',
    );
    await reply.status(501).send({
      code: 'AUTH_NOT_IMPLEMENTED',
      message: 'Authentication is not implemented yet.',
    });
    return;
  }

  const id = request.headers['x-actor-id'];
  const role = request.headers['x-actor-role'];

  if (
    typeof id !== 'string' ||
    typeof role !== 'string' ||
    !ROLES.includes(role as PrincipalRole)
  ) {
    await reply.status(401).send({
      code: 'UNAUTHENTICATED',
      message:
        'Development stub expects the x-actor-id and x-actor-role headers.',
    });
    return;
  }

  request.principal = { id, role: role as PrincipalRole };
}
