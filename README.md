# The Chronicles of Torres

Publishing platform built from scratch — a CMS whose point is the engineering,
not the content management. Own infrastructure, own code, own security
boundary, no Enterprise licence between me and SSO, RBAC or audit logs.

## Stack

| Layer | Choice |
| --- | --- |
| API | ASP.NET Core 10, C# |
| Front | Next.js 16 (App Router) + Tailwind CSS 4 |

Persistence is deliberately absent — see [Current state](#current-state).

## Structure

```text
chronicles-api/       ASP.NET Core — owns the HTTP contract
  Chronicles.slnx
  src/
    Chronicles.Domain/    entities, value objects, domain rules
    Chronicles.Services/  application services (auth, weather scaffold)
    Chronicles.Core/      composition root / DI wiring
    Chronicles.WebApi/    controllers, Program.cs, configuration
chronicles-web/       Next.js — HTTP client of the API
docs/
  architecture/       decision records
```

The two projects are self-contained: each one is installed, built and run from
inside its own folder. There is no package manager, task runner or lockfile at
the root — only the docs and the conventions shared by both
(`.editorconfig`, `.gitattributes`, `.gitignore`).

Architecture decisions live in
[`docs/architecture/monorepo.md`](docs/architecture/monorepo.md). Read it
before changing the shape of anything.

## Running

Two terminals, one per project.

```bash
cd chronicles-api
dotnet watch --project src/Chronicles.WebApi
```

```bash
cd chronicles-web
cp .env.example .env.local   # first run only
pnpm install                 # first run only
pnpm dev
```

ASP.NET Core does not read `.env` files. The API's configuration lives in
`chronicles-api/src/Chronicles.WebApi/appsettings*.json`;
`appsettings.Development.json` is gitignored because it holds the JWT signing
key.

### Ports

| Service | Port | Note |
| --- | --- | --- |
| API | 5043 (http) / 7084 (https) | `/docs` serves the Scalar OpenAPI UI |
| Web | 3000 | |

## Current state

`chronicles-api` is a scaffold: JWT issuing and validation are wired
(`Chronicles.Services/Auth`), plus the template weather endpoint that still
needs to be deleted.

**There is no persistence.** No database, no ORM, no migrations — by decision,
not by omission. The editorial domain and its storage come later, and the
choice of how to store it is deliberately still open.

`chronicles-web` is an untouched `create-next-app` template.

### Previous incarnation

An earlier version of this platform lived as a Fastify + Prisma API with the
`editorial` context implemented end to end, against a Postgres container. It
was archived, not deleted — see `../the-chronicles-of-torres-old`. Its domain
model is the reference when the editorial context is rebuilt here, and its
`docker-compose.yml` is where the Postgres setup can be recovered from.
