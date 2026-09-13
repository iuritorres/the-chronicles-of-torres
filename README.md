# The Chronicles of Torres

Publishing platform built from scratch — a CMS whose point is the engineering,
not the content management. Own infrastructure, own code, own security
boundary, no Enterprise licence between me and SSO, RBAC or audit logs.

## Stack

| Layer | Choice |
| --- | --- |
| API | Fastify 5, TypeScript, ESM |
| Domain | DDD — aggregates, value objects, domain events |
| Database | PostgreSQL 17 + Prisma 7 (`pg` driver adapter) |
| Front | Next.js 16 (App Router) + Tailwind CSS 4 |
| Monorepo | pnpm workspaces + Turborepo |

## Structure

```text
apps/
  api/          Fastify — owns the database and the HTTP contract
  web/          Next.js — HTTP client of the API, never touches Postgres
packages/
  tsconfig/     shared TypeScript config
docs/
  architecture/ decision records
```

Architecture decisions live in
[`docs/architecture/monorepo.md`](docs/architecture/monorepo.md) and
[`docs/architecture/backend.md`](docs/architecture/backend.md). Read those
before changing the shape of anything.

## Setup

```bash
pnpm install
cp .env.example .env                 # drives docker compose
cp apps/api/.env.example apps/api/.env   # drives the API and Prisma CLI
pnpm db:up                           # Postgres in Docker
pnpm --filter @chronicles/api db:migrate
pnpm dev                             # api + web
```

### Ports

| Service | Port | Note |
| --- | --- | --- |
| API | 3333 | `/docs` serves the OpenAPI UI |
| Web | 3000 | |
| Postgres | **5433** | 5432 is left to whatever Postgres is already installed on the host |

## Current state

The `editorial` bounded context is implemented end to end: `Post` as an
aggregate root with `Comment` inside it, publish/archive/revise rules, a
read-side projection for the public listing, and an OpenAPI document generated
from the route schemas.

**Authentication is not implemented yet.** `requireActor` is a development stub
that trusts `x-actor-id` and `x-actor-role` headers and refuses to run outside
development, so the write endpoints answer 501 rather than standing open. The
`auth` module replaces it.

Next modules, in order: `auth` (OAuth2/OIDC), `governance` (audit log, fed by
the domain events aggregates already emit), `media` (upload and sanitisation).

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | every app in watch mode |
| `pnpm build` | build everything |
| `pnpm typecheck` | type-check everything |
| `pnpm db:up` / `pnpm db:down` | Postgres container |
| `pnpm --filter @chronicles/api db:studio` | Prisma Studio |
