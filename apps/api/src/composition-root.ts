import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { PostService } from './modules/editorial/application/post-service.js';
import { PrismaAuthorRepository } from './modules/editorial/infrastructure/persistence/prisma-author-repository.js';
import { PrismaPostRepository } from './modules/editorial/infrastructure/persistence/prisma-post-repository.js';
import { InProcessDomainEventBus } from './shared/infrastructure/events/in-process-event-bus.js';

/**
 * The one place where interfaces meet implementations, and where event
 * handlers are subscribed.
 *
 * No DI container, no decorators, no reflection: the whole dependency graph is
 * an expression you can read top to bottom. Swapping Prisma for anything else
 * is a change confined to this file and to the classes it names.
 */
export interface Container {
  postService: PostService;
}

export function buildContainer(deps: {
  prisma: PrismaClient;
  logger: FastifyBaseLogger;
}): Container {
  const eventBus = new InProcessDomainEventBus(deps.logger);

  const postRepository = new PrismaPostRepository(deps.prisma);
  const authorRepository = new PrismaAuthorRepository(deps.prisma);

  const postService = new PostService(postRepository, authorRepository, eventBus);

  // Event handlers are registered here, by the module that reacts. Nothing is
  // subscribed yet: `editorial` emits `editorial.post.published` and the
  // `governance` module will be its first listener.
  //
  //   eventBus.subscribe('auth.user.created', (e) => welcomePost.handle(e));

  return { postService };
}
