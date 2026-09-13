import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { buildContainer } from './composition-root.js';
import { env } from './config/env.js';
import { postRoutes } from './modules/editorial/infrastructure/http/post-routes.js';
import { registerErrorHandler } from './shared/infrastructure/http/error-handler.js';
import './shared/infrastructure/http/principal.js';
import { createPrismaClient } from './shared/infrastructure/prisma/prisma-client.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty' } }
        : env.NODE_ENV !== 'test',
  }).withTypeProvider<ZodTypeProvider>();

  // Zod schemas on routes serve three purposes at once: runtime validation,
  // handler type inference, and the OpenAPI document.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandler(app);

  await app.register(helmet);
  await app.register(cors, { origin: env.CORS_ORIGIN.split(',') });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'The Chronicles of Torres — API',
        description:
          'Publishing platform API. This document is the source of truth for non-TypeScript consumers.',
        version: '0.1.0',
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  const prisma = createPrismaClient();
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  const container = buildContainer({ prisma, logger: app.log });

  app.get('/health', { schema: { hide: true } }, async () => ({ status: 'ok' }));

  await app.register(postRoutes, {
    prefix: '/posts',
    postService: container.postService,
    postQueryService: container.postQueryService,
  });

  return app;
}
