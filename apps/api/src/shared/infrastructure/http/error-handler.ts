import type { FastifyError, FastifyInstance } from 'fastify';
import { DomainError } from '../../domain/domain-error.js';
import { InvalidEntityIdError } from '../../domain/unique-entity-id.js';

/**
 * Under a type provider the handler receives `unknown`, which is honest: a
 * thrown value is not guaranteed to be an Error at all.
 */
function asFastifyError(error: unknown): Partial<FastifyError> {
  return (
    typeof error === 'object' && error !== null ? error : {}
  ) as Partial<FastifyError>;
}

/**
 * Transport-level translation of domain vocabulary.
 *
 * Domain errors carry a stable `code` and no HTTP status — status is a
 * transport concern and lives here. A new domain error with no entry falls
 * through to 500, which is the safe default: it surfaces the gap instead of
 * inventing a semantics for it.
 */
const STATUS_BY_DOMAIN_CODE: Readonly<Record<string, number>> = {
  POST_NOT_FOUND: 404,
  AUTHOR_NOT_FOUND: 404,
  COMMENT_NOT_FOUND: 404,

  SLUG_ALREADY_TAKEN: 409,
  POST_ALREADY_PUBLISHED: 409,
  COMMENTS_CLOSED: 409,

  POST_NOT_PUBLISHABLE: 422,

  INVALID_POST_TITLE: 400,
  INVALID_SLUG: 400,
  EMPTY_POST_BODY: 400,
  INVALID_COMMENT: 400,

  FORBIDDEN_POST_ACTION: 403,
};

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(async (error, request, reply) => {
    const fastifyError = asFastifyError(error);

    if (fastifyError.validation) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'The request payload is invalid.',
        issues: fastifyError.validation,
      });
    }

    if (error instanceof InvalidEntityIdError) {
      return reply.status(400).send({
        code: error.code,
        message: error.message,
      });
    }

    if (error instanceof DomainError) {
      const status = STATUS_BY_DOMAIN_CODE[error.code];

      if (status === undefined) {
        request.log.error(
          { err: error, code: error.code },
          'Domain error without an HTTP mapping.',
        );
        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error.',
        });
      }

      return reply.status(status).send({
        code: error.code,
        message: error.message,
      });
    }

    request.log.error({ err: error }, 'Unhandled error.');

    return reply.status(fastifyError.statusCode ?? 500).send({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error.',
    });
  });
}
