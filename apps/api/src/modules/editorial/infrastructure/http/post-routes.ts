import type { UUID } from 'node:crypto';
import { PostStatus } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireActor } from '../../../../shared/infrastructure/http/require-actor.js';
import type { PostService } from '../../application/post-service.js';
import { Actor } from '../../domain/actor.js';

const commentView = z.object({
  id: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.date(),
});

const publishedPostListItem = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  authorName: z.string(),
  publishedAt: z.date(),
  commentCount: z.number().int(),
});

const publishedPostDetail = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  body: z.string(),
  authorName: z.string(),
  publishedAt: z.date(),
  comments: z.array(commentView),
});

const postSnapshot = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  body: z.string(),
  status: z.nativeEnum(PostStatus),
  authorId: z.string(),
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  comments: z.array(commentView.extend({ postId: z.string() })),
});

const postIdParams = z.object({ postId: z.string().uuid() });
const slugParams = z.object({ slug: z.string().min(1) });

/**
 * Translates a transport-level principal into the editorial context's own
 * `Actor`. No other module's user type crosses this boundary.
 *
 * The id is asserted rather than parsed because `requireActor` only accepts a
 * principal whose id already passed validation.
 */
function actorOf(request: FastifyRequest): Actor {
  const { principal } = request;
  if (!principal) {
    throw new Error(
      'actorOf was called on a route that does not run the requireActor preHandler.',
    );
  }
  return Actor.create({ id: principal.id as UUID, role: principal.role });
}

export interface PostRoutesOptions {
  postService: PostService;
}

export const postRoutes: FastifyPluginAsyncZod<PostRoutesOptions> = async (
  app,
  { postService },
) => {
  app.get(
    '/',
    {
      schema: {
        tags: ['posts'],
        summary: 'List published posts, newest first.',
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(50).optional(),
          cursor: z.string().uuid().optional(),
        }),
        response: {
          200: z.object({
            items: z.array(publishedPostListItem),
            nextCursor: z.string().nullable(),
          }),
        },
      },
    },
    async (request) =>
      postService.listPublished({
        limit: request.query.limit,
        cursor: request.query.cursor,
      }),
  );

  app.get(
    '/:slug',
    {
      schema: {
        tags: ['posts'],
        summary: 'Read a published post by slug.',
        params: slugParams,
        response: { 200: publishedPostDetail },
      },
    },
    async (request) => postService.getPublishedBySlug(request.params.slug),
  );

  app.post(
    '/:slug/comments',
    {
      schema: {
        tags: ['comments'],
        summary: 'Comment on a published post.',
        params: slugParams,
        body: z.object({
          authorName: z.string().min(1).max(80),
          body: z.string().min(1).max(2000),
        }),
        response: { 201: postSnapshot },
      },
    },
    async (request, reply) => {
      const post = await postService.addComment(request.params.slug, request.body);
      return reply.status(201).send(post);
    },
  );

  app.post(
    '/',
    {
      preHandler: requireActor,
      schema: {
        tags: ['posts'],
        summary: 'Create a draft post.',
        body: z.object({
          title: z.string().min(1).max(140),
          body: z.string().min(1),
        }),
        response: { 201: postSnapshot },
      },
    },
    async (request, reply) => {
      const post = await postService.create({
        title: request.body.title,
        body: request.body.body,
        authorId: actorOf(request).id,
      });
      return reply.status(201).send(post);
    },
  );

  app.patch(
    '/:postId',
    {
      preHandler: requireActor,
      schema: {
        tags: ['posts'],
        summary: 'Revise a post. A published post keeps its slug.',
        params: postIdParams,
        body: z
          .object({
            title: z.string().min(1).max(140).optional(),
            body: z.string().min(1).optional(),
          })
          .refine(
            (value) => value.title !== undefined || value.body !== undefined,
            { message: 'Provide at least a title or a body.' },
          ),
        response: { 200: postSnapshot },
      },
    },
    async (request) =>
      postService.revise(
        request.params.postId as UUID,
        request.body,
        actorOf(request),
      ),
  );

  app.post(
    '/:postId/publish',
    {
      preHandler: requireActor,
      schema: {
        tags: ['posts'],
        summary: 'Publish a draft.',
        params: postIdParams,
        response: { 200: postSnapshot },
      },
    },
    async (request) =>
      postService.publish(request.params.postId as UUID, actorOf(request)),
  );

  app.post(
    '/:postId/archive',
    {
      preHandler: requireActor,
      schema: {
        tags: ['posts'],
        summary: 'Archive a post.',
        params: postIdParams,
        response: { 200: postSnapshot },
      },
    },
    async (request) =>
      postService.archive(request.params.postId as UUID, actorOf(request)),
  );

  app.post(
    '/:postId/draft',
    {
      preHandler: requireActor,
      schema: {
        tags: ['posts'],
        summary: 'Send a published or archived post back to draft.',
        params: postIdParams,
        response: { 200: postSnapshot },
      },
    },
    async (request) =>
      postService.restoreToDraft(
        request.params.postId as UUID,
        actorOf(request),
      ),
  );

  app.delete(
    '/:postId/comments/:commentId',
    {
      preHandler: requireActor,
      schema: {
        tags: ['comments'],
        summary: 'Remove a comment from a post.',
        params: postIdParams.extend({ commentId: z.string().uuid() }),
        response: { 200: postSnapshot },
      },
    },
    async (request) =>
      postService.removeComment(
        request.params.postId as UUID,
        request.params.commentId as UUID,
        actorOf(request),
      ),
  );
};
