# Estratégia de Monorepo

> Status: **aceito** · Data: 2026-09-12

## Contexto

A plataforma (blog / CMS próprio) é o núcleo, mas o projeto também serve como
laboratório de aprendizado. É esperado que surjam satélites ao redor dela:
scripts Python de tratamento e exportação de dados, funções serverless,
eventuais microserviços em outras linguagens, automações de publicação.

A pergunta: tudo isso mora no mesmo repositório?

## Decisão

**Sim, monorepo — mas com critério de entrada explícito.**

O monorepo não é "tudo que eu estudar". Ele guarda o que compartilha o
**contrato de domínio** da plataforma.

### Critério de entrada

> O projeto quebra, ou fica desatualizado, se o schema de `Post` / `Author` /
> `AuditLog` mudar?

- **Sim** → entra no monorepo.
- **Não** → repositório separado.

Exemplos:

| Projeto | Entra? | Motivo |
| --- | --- | --- |
| API Fastify | sim | dona do contrato |
| Front Next.js | sim | consome o contrato |
| Script Python que exporta posts para newsletter | sim | acopla ao schema de Post |
| Worker que gera thumbnails de mídia | sim | acopla ao schema de Media |
| Sandbox de estudo de Rust/Go sem relação com o blog | **não** | repo próprio |
| Dotfiles, configs pessoais | **não** | repo próprio |

## Motivação

- **Desenvolvimento assistido por IA.** Um agente enxerga API, front e schema
  no mesmo contexto. Refactor cross-package vira uma sessão, não três repos e
  cópia manual de tipos. Um `CLAUDE.md` na raiz descreve o sistema inteiro.
- **Contrato único.** O schema de publicação é definido uma vez e derivado para
  os demais consumidores (ver "Contrato entre linguagens").
- **Setup único.** Um `docker compose up` sobe o Postgres usado por todos.
- **Proof of work.** Um repositório coeso demonstra um sistema; seis repositórios
  órfãos demonstram fragmentos.

## Custos aceitos

- **Tooling polyglot é fraco.** pnpm + Turborepo cobrem bem o ecossistema
  TypeScript. Python **não entra no workspace pnpm** — vive isolado, com `uv`
  e pipeline de CI próprio.
- **Deploy precisa de filtro por path.** Sem isso, todo push rebuilda tudo.
  Usar `paths:` no GitHub Actions e root directory por app na plataforma de deploy.
- **Histórico git mais ruidoso.** Commits com escopo
  (`feat(api):`, `fix(web):`) passam a ser obrigatórios, não opcionais.

## Estrutura

```
the-chronicles-of-torres/
├── apps/
│   ├── api/          # Fastify + Prisma — dona do banco e do contrato HTTP
│   └── web/          # Next.js + Tailwind — cliente HTTP puro da API
├── packages/
│   └── tsconfig/     # configs TypeScript compartilhadas
├── docs/
│   └── architecture/
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

### Regra de crescimento

Pastas como `services/`, `packages/contracts` ou `packages/db` **não são criadas
antecipadamente**. Cada uma nasce quando existe um segundo consumidor real.
Diretório vazio "para o futuro" é dívida, não preparo.

Quando satélites em outras linguagens chegarem, eles entram em `services/`
(fora do workspace pnpm), cada um com seu próprio gerenciador de dependências.

## Decisões relacionadas

### Next.js consome a API, não o banco

O front **não** acessa Postgres diretamente. Toda leitura e escrita passa pela
API Fastify.

Consequência: o Prisma vive dentro de `apps/api` e **não** existe um
`packages/db`. O front é um cliente HTTP, pode escalar e ser publicado de forma
independente, e a fronteira entre as camadas permanece real — não apenas
convencional.

### Turborepo desde o início

pnpm workspaces puro bastaria para dois apps, mas o Turbo entra já para
estabelecer o pipeline (`build` → `typecheck` → `test`) e o cache antes que o
build comece a doer.

## Contrato entre linguagens

Python não importa tipo TypeScript. A fonte da verdade é o **OpenAPI gerado
pela API Fastify** a partir dos JSON Schemas das rotas (`@fastify/swagger`).

A partir dele:

- **TypeScript** → client tipado gerado
- **Python** → models gerados via `datamodel-code-generator`

Isso resolve o polyglot sem depender de mágica de monorepo — e continua
funcionando se um serviço for extraído para um repositório próprio no futuro.

## Revisão

Esta decisão deve ser reavaliada se:

- o tempo de CI passar a incomodar mesmo com filtro por path;
- algum satélite ganhar ciclo de release próprio, desacoplado da plataforma;
- um serviço passar a ter mais de um consumidor externo ao monorepo.
