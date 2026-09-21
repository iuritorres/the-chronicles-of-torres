# Estratégia de Monorepo

> Status: **aceito** · Data: 2026-09-21
> Substitui a decisão de 2026-09-12, arquivada no branch
> [`archive/fastify-prisma`](https://github.com/iuritorres/the-chronicles-of-torres/tree/archive/fastify-prisma).

## Contexto

A plataforma (blog / CMS próprio) é o núcleo, mas o projeto também serve como
laboratório de aprendizado. É esperado que surjam satélites ao redor dela:
scripts de tratamento e exportação de dados, funções serverless, automações de
publicação.

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

| Projeto | Entra? | Motivo |
| --- | --- | --- |
| API ASP.NET Core | sim | dona do contrato |
| Front Next.js | sim | consome o contrato |
| Script que exporta posts para newsletter | sim | acopla ao schema de Post |
| Sandbox de estudo sem relação com o blog | **não** | repo próprio |
| Dotfiles, configs pessoais | **não** | repo próprio |

## Motivação

- **Desenvolvimento assistido por IA.** Um agente enxerga API, front e schema
  no mesmo contexto. Refactor cross-app vira uma sessão, não dois repos e
  cópia manual de tipos.
- **Contrato único.** O schema de publicação é definido uma vez, na API, e
  derivado para os demais consumidores via OpenAPI.
- **Proof of work.** Um repositório coeso demonstra um sistema; vários
  repositórios órfãos demonstram fragmentos.

## Estrutura

```text
the-chronicles-of-torres/
├── chronicles-api/    ASP.NET Core 10 — dona do contrato HTTP
├── chronicles-web/    Next.js 16 — cliente HTTP puro da API
├── docs/architecture/
├── README.md
├── .editorconfig
├── .gitattributes
└── .gitignore
```

A raiz guarda só o que é do **repositório**: documentação e convenções que
valem para os dois projetos. Nada que pertença a um deles em particular.

### Layout plano, não `apps/`

Com dois apps de **runtimes diferentes**, `apps/` não agrupa nada: ele só
esconde a assimetria real (um projeto .NET com solução própria ao lado de um
workspace pnpm) atrás de um nível de diretório que não carrega informação. O
prefixo `chronicles-` já identifica o que pertence à plataforma.

Quando existir um terceiro app, `apps/` volta à mesa.

### Regra de crescimento

Pastas como `packages/` ou `services/` **não são criadas antecipadamente**.
Cada uma nasce quando existe um segundo consumidor real. Diretório vazio "para
o futuro" é dívida, não preparo.

Foi por essa regra que `packages/tsconfig` não sobreviveu à migração: com um
único app TypeScript, um pacote de config compartilhada não compartilha nada.

## Decisões relacionadas

### API em .NET

O backend Node (Fastify + Prisma) foi substituído por ASP.NET Core. O motivo é
o propósito do projeto — o blog existe para documentar aprendizado, e o
aprendizado buscado aqui é C# / .NET, não mais um backend TypeScript.

Custo aceito: o contexto `editorial` já implementado em TypeScript precisa ser
portado. O branch `archive/fastify-prisma` permanece como referência de
modelagem.

### Persistência fica em aberto

O Prisma e o container Postgres saíram junto com o backend Node, e **nada os
substituiu ainda**: não há ORM, banco ou migrations neste repositório.

Isso é decisão, não pendência esquecida. Escolher o mecanismo de persistência
antes de existir um modelo de domínio em C# seria escolher no vácuo — a
decisão espera o contexto `editorial` tomar forma. Até lá a API não tem estado.

O `docker-compose.yml` do branch `archive/fastify-prisma` é o ponto de partida
quando o Postgres voltar.

### Sem task runner e sem raiz Node

Turborepo saiu junto com o backend Node. Ele orquestra tarefas **dentro** do
workspace pnpm — e com um único app TypeScript restante não há grafo de
dependências para resolver, nem cache que compense a configuração.

O workspace pnpm foi embora atrás dele, e com ele o `package.json` da raiz.
Um workspace de um membro só não agrupa nada; o que restava era um
`package.json` cuja única função era hospedar scripts `api:*` que chamavam
`dotnet`. Isso tinha três defeitos: punha o Node como fachada de um projeto
.NET, obrigava um `pnpm install` na raiz para rodar comando que não usa Node,
e escondia o comando real atrás de uma indireção.

Cada projeto é autocontido e se roda de dentro da própria pasta:

```bash
cd chronicles-api && dotnet watch --project src/Chronicles.WebApi
cd chronicles-web && pnpm dev
```

O custo aceito é não existir um comando único que suba tudo. Quando isso
incomodar de verdade — provavelmente com um terceiro processo na rotina — a
resposta é um task runner neutro de linguagem (`just`, `make`), na raiz, e não
a volta do `package.json` como intermediário.

### Next.js consome a API, não os dados

O front **não** fala com o armazenamento diretamente, qualquer que venha a ser
ele. Toda leitura e escrita passa pela API. Consequência: o acesso a dados
vive inteiro dentro de `chronicles-api`, a fronteira entre as camadas
permanece real — não apenas convencional — e o front pode ser publicado de
forma independente.

## Contrato entre linguagens

A fonte da verdade é o **OpenAPI gerado pela API** a partir dos schemas das
rotas (`Microsoft.AspNetCore.OpenApi`, servido pelo Scalar em `/docs`).

A partir dele, um client TypeScript tipado é gerado para o front. Isso resolve
o polyglot sem depender de mágica de monorepo — e continua funcionando se um
serviço for extraído para um repositório próprio no futuro.

## Revisão

Esta decisão deve ser reavaliada se:

- um terceiro app entrar no repositório (rever layout plano e task runner);
- algum satélite ganhar ciclo de release próprio, desacoplado da plataforma;
- o tempo de CI passar a incomodar mesmo com filtro por path.
