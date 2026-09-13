# Arquitetura do Backend — DDD + Clean/Hexagonal

> Status: **aceito** · Data: 2026-09-12 · Aplica-se a: `apps/api`

## Objetivo

Backend do sistema de blog/publicação aplicando DDD prático, com arquitetura
desacoplada que separa regra de negócio pura de detalhe de infraestrutura.

## Organização

O sistema é dividido em **Bounded Contexts** (`src/modules/<contexto>`), cada um
com três camadas de responsabilidade estrita.

```text
src/
├── shared/                      # blocos de construção, sem regra de negócio
│   ├── domain/                  # DomainEvent, EmitsDomainEvents, DomainError
│   ├── application/             # contratos transversais (DomainEventBus)
│   └── infrastructure/          # Prisma client, error handler HTTP, guards
├── modules/
│   └── editorial/
│       ├── domain/              # ⬅ zero dependência externa
│       ├── application/         # ⬅ depende só de domain
│       └── infrastructure/      # ⬅ depende de tudo, implementa as interfaces
├── config/env.ts
├── composition-root.ts
├── app.ts
└── server.ts
```

### 1. `domain/` — o coração

Apenas código puro da linguagem. **Nenhum** import de framework, ORM ou
biblioteca de terceiros.

Contém: Entidades, Domain Events, erros de domínio e as **interfaces** dos
repositórios.

**Sem Value Objects e sem classes-base.** Normalização e invariante de
propriedade moram como métodos estáticos privados na própria entidade
(`Post.normalizeTitle`, `Post.slugify`). Ver "Validação dentro da entidade".

**Regra de ouro:** é onde a regra de negócio se decide. `post.publish()` valida
estado, autorização de propriedade e tamanho mínimo antes de mudar o status.

### 2. `application/` — o maestro

Orquestra o fluxo. **Não decide regra de negócio.**

Padrão: busca a entidade pela interface do repositório → chama o método de
negócio da entidade → persiste → despacha eventos.

**Teste rápido:** um `if` que determina resultado de negócio não pertence aqui.
`if (!post) throw NotFound` é orquestração. `if (post.body.length < 500) throw`
é domínio.

### 3. `infrastructure/` — a tecnologia

Controllers HTTP, rotas, schemas Zod, implementações Prisma dos repositórios,
mappers, e a resolução da Injeção de Dependência.

## Decisões de design

### Contextos nomeiam capacidades, não ações nem entidades

O módulo chamava-se `publication` e foi renomeado para `editorial`.

`publication` nomeava **o ato** de publicar, e o módulo faz mais do que isso:
escreve, revisa, arquiva, modera. O nome já mentia em `revise()` e
`addComment()`, e mentiria mais quando entrar fluxo de revisão — que os três
papéis do RBAC (`ADMIN`, `EDITOR`, `AUTHOR`) claramente antecipam.

Descartados no caminho: `content` (genérico demais — mídia e audit log também
são conteúdo, fronteira sem força), `blog` (acopla ao formato atual do produto),
`posts` (nomear contexto por entidade — contexto é capacidade, não tabela).

**Teste para nomear um contexto novo:**

> O nome continua verdadeiro quando eu adicionar a próxima feature?

| Feature futura | `editorial` | `publication` |
| --- | --- | --- |
| Agendamento de publicação | ✅ | ✅ |
| Fluxo de revisão (autor → editor aprova) | ✅ | ⚠️ revisão não é publicação |
| Rascunho colaborativo | ✅ | ❌ |

### Um service por entidade, não um Use Case por classe

**Decisão:** a camada de aplicação usa um *service* por entidade raiz
(`PostService`), não uma classe por caso de uso (`CreatePostUseCase`,
`PublishPostUseCase`, ...).

**Motivo:** "use case por classe" é convenção de Clean Architecture, não
exigência de DDD. O custo dela é cerimônia — cada operação vira 3 a 4 arquivos
(classe + Input + Output + interface). Doze operações viram ~48 arquivos para
200 linhas de orquestração real.

Pior: o custo alto de criar um use case empurra regra de negócio para dentro
dele, produzindo exatamente o modelo anêmico que queremos evitar.

Como o domínio aqui é rico, o service é fino por construção — métodos de 10 a 20
linhas. Ele não incha porque não há o que inchar.

**Guardrails obrigatórios:**

1. **Um service por entidade raiz**, não por módulo. `PostService`, nunca um
   `EditorialService` guarda-chuva.
2. **Service não decide regra.** Ver o teste rápido acima.
3. **Teto duro: mais de 5 dependências no construtor** → dividir por
   sub-assunto. Contagem de métodos **não** é critério: leitura e escrita da
   mesma entidade compartilham a mesma porta.
4. **Nome de método = intenção**, não CRUD. `publish()`, `archive()` —
   nunca `updateStatus()`.
5. **Regra de storage não sobe pro service.** Limite de paginação e tradução de
   erro de banco vivem na implementação do repositório; o service orquestra
   fluxo.

**Escape hatch:** se um fluxo específico ficar gordo — publicação com
agendamento, notificação e invalidação de cache, por exemplo — extrai-se **só
ele** como use case dedicado. O híbrido é legítimo.

> **Leitura e escrita na mesma porta.** `PostService` expõe comandos
> (`publish`, `addComment`) e leituras (`listPublished`) juntos. Um
> `PostQueryService` separado existiu e foi removido: para leitura ele só
> repassava argumento, que é exatamente a camada-cerimônia que este documento
> quer evitar.
>
> O que **não** se mistura é o formato de retorno: comando carrega e devolve a
> entidade; leitura devolve projeção (`PublishedPostListItem`), montada por um
> `select` que traz só as colunas da view. Listar posts não hidrata entidade
> nem carrega comentário nenhum.

### Modelo rico, nunca anêmico

Entidades não são caixas de propriedades com getters e setters.
`post.setStatus('PUBLISHED')` é proibido; `post.publish(actor)` é a forma.

Props ficam privadas. A persistência lê o estado por `toSnapshot()` e reconstrói
por `Post.restore()` — sem abrir setters para o mundo.

### Validação dentro da entidade, não em Value Objects

Regra de propriedade mora na própria entidade, como método estático privado:

```ts
private static normalizeTitle(raw: string): string { ... }
private static slugify(title: string): string { ... }
```

O construtor é `private`, então **todo** caminho que produz um `Post` passa por
`draft()` ou `restore()` e roda a mesma normalização. Consequência: não existe
`Post` inválido em memória, e a garantia não depende de validação na borda HTTP
— um seed, um handler de evento ou um comando de CLI recebem a mesma proteção.

Houve `PostTitle`, `PostBody` e `Slug` como Value Objects. Foram removidos:
duas dessas classes só faziam `trim` e checagem de tamanho, que o schema Zod da
rota já cobria. A terceira (`Slug`) tinha lógica real, mas ela cabe como método
estático sem precisar de um tipo próprio.

**Quando um VO voltaria a se justificar:** quando o valor precisar circular
sozinho entre entidades, carregando comportamento junto. Enquanto ele só existe
como propriedade de uma entidade, é cerimônia.

### `Post` é dono de `Comment`

Um comentário não tem ciclo de vida independente do post. Toda operação com
comentários passa pelo post: `post.addComment(...)`, `post.removeComment(...)`.

Consequências:

- Não existe `CommentRepository`. `PostRepository.save(post)` persiste post e
  comentários como uma unidade.
- `Comment` tem `onDelete: Cascade` no schema — o mesmo fato, refletido no banco.

**Sinal de alerta:** no dia em que comentário ganhar ciclo de vida próprio —
fila de moderação, threading, autor autenticado, reações — ele deixa de
pertencer ao post e vira contexto separado (`engagement`). O sintoma concreto é
precisar de um `CommentRepository`.

### Transação por caso de uso, não por agregado

A regra clássica de DDD — **um agregado por transação** — foi **descartada**.

Aqui uma transação cobre o processo inteiro dentro de um contexto, quantas
entidades ele precisar tocar. O que se ganha com a regra clássica (menos
contenção de lock, fronteira pronta para distribuir o contexto em serviço
separado) é teórico na escala deste sistema; o que se paga (consistência
eventual entre partes que o usuário enxerga como uma coisa só) é imediato.

O que **fica** da ideia de agregado é o encapsulamento: `Post` é a única porta
para `Comment`. É isso que faz `addComment` conseguir recusar um draft — e não
tem relação com fronteira transacional.

**Como o código suporta isso:** o repositório recebe
`PrismaClient | Prisma.TransactionClient`.

```ts
constructor(private readonly db: PrismaExecutor) {}

withTransaction(tx: Prisma.TransactionClient): PrismaPostRepository {
  return new PrismaPostRepository(tx);
}
```

`save()` detecta em qual dos dois está: dentro de uma transação, participa dela;
fora, abre a sua própria, para que uma escrita avulsa continue atômica.

Com isso a camada de aplicação pode orquestrar várias escritas — sequenciais ou
paralelas — sob uma transação só, sem que nenhuma linha do domínio mude. O
`UnitOfWork` propriamente dito só entra quando existir um caso de uso que
precise dele; hoje nenhum precisa.

### Domain Events: Observer, sem classe-base

Emitir evento é **capacidade, não herança**. Não existe `AggregateRoot` para
estender: a entidade declara a interface `EmitsDomainEvents` e guarda o próprio
buffer.

```ts
export class Post implements EmitsDomainEvents {
  #events: DomainEvent[] = [];

  pullEvents(): DomainEvent[] { ... }
}
```

Como TypeScript é estruturalmente tipado, uma entidade que já expõe
`pullEvents()` satisfaz a interface sem declarar `implements` — a cláusula é
escrita mesmo assim, como documentação de intenção. Isso também significa que
**adiar abstração custa zero**: uma interface criada depois passa a ser
satisfeita retroativamente, sem tocar nas classes.

As três peças:

| Papel | Onde |
| --- | --- |
| **Emissor** | a entidade — `this.#events.push(...)` |
| **Dispatcher** | `InProcessDomainEventBus` — `Map<eventName, handler[]>` |
| **Handler** | o módulo que **reage**, registrado no `composition-root.ts` |

`PostService.persist()` salva e só então despacha: um evento nunca anuncia um
estado que falhou em persistir.

**Handler que lança não derruba a operação.** O fato já aconteceu e já foi
persistido; uma reação que falha é logada e os demais handlers seguem. Essa
tolerância é também o limite: hoje um handler que falha se perde. Transformar
"logado e perdido" em "retentado até passar" é o que exige broker com outbox.

**Handler não importa o evento do módulo emissor** — importar acoplaria os
contextos. Ele lê `event.payload` e valida com um schema Zod próprio. Handler de
integração também precisa de **idempotência**: broker reentrega, e reprocessar
`UserCreated` não pode gerar dois posts de boas-vindas.

### Desacoplamento entre módulos: `Author`, não `User`

O módulo `editorial` **não** importa a entidade `User` do módulo `auth`.
Ele tem sua própria visão minimalista — `Author` (`id` + `name`) e `Actor`
(`id` + `role`) — contendo apenas o que o contexto editorial precisa saber.

A amarração é feita por ID. A sincronização, quando necessária, por eventos.

Isso significa que o contexto editorial continua compilando e testando sem
conhecer nada sobre senhas, sessões, OAuth ou providers de SSO.

### Inversão de dependência

`domain/` e `application/` dependem apenas de **interfaces** de repositório.
`infrastructure/` as implementa.

A direção das setas é sempre para dentro: infra → application → domain.
O domínio não aponta para ninguém.

### Prisma 7: URL fora do schema, conexão por driver adapter

A partir do Prisma 7 o `datasource` do schema não aceita mais `url`. A URL de
conexão passou a viver em dois lugares distintos, por papel:

| Quem precisa | Onde lê |
| --- | --- |
| CLI (`migrate`, `studio`) | `prisma.config.ts` |
| Aplicação em execução | driver adapter (`@prisma/adapter-pg`) |

`prisma.config.ts` importa o mesmo `src/config/env.ts` que o servidor usa, então
CLI e aplicação validam as mesmas variáveis com o mesmo schema Zod — um typo
falha num lugar só.

O adapter traz um ganho lateral: o pool é um `pg` comum, então pooling, TLS e
timeouts se configuram com opções de node-postgres, não com parâmetros
específicos do Prisma.

**Por que migrar já na primeira semana:** a linha 6.x parou de receber patches
em 2026-04-01 e a 7.x seguiu com ~10 releases no mesmo intervalo. Ficar no 6
não era estabilidade, era uma linha sem manutenção — inaceitável para um
sistema que vai ganhar autenticação e audit log.

**Não migrado de propósito:** o generator continua `prisma-client-js`, que o v7
aceita sem deprecation. Trocar para o generator `prisma-client` mudaria o local
do client gerado e todos os imports, sem ganho hoje. Revisar quando a 8.0
estabilizar.

**A vigiar:** `prisma.config.ts` fica fora do `include` do `tsconfig.json` (que
cobre só `src`), logo não entra no `typecheck`. São 20 linhas exercitadas a cada
comando do CLI, mas um erro ali só aparece em runtime.

### Injeção de dependência: composition root manual

Sem container mágico (awilix, tsyringe, decorators de DI). O grafo inteiro é
instanciado explicitamente em `src/composition-root.ts` e registrado como
decorator do Fastify.

**Motivo:** um arquivo legível de cima a baixo descreve todo o wiring. Vale
tanto para humano quanto para agente de IA lendo o repositório.

### Imports relativos, sem path alias

`../../shared/domain/entity.js` em vez de `@/shared/domain/entity`.

**Motivo:** path alias em TypeScript exige reescrita no build (`tsc-alias`) e
configuração paralela no runner de testes. Import relativo funciona igual em
`tsx`, `tsc`, `vitest` e `node` sem nenhuma peça extra. A profundidade máxima
aqui é de 3 níveis.

Extensão `.js` nos imports é exigência de ESM com `moduleResolution: nodenext` —
o arquivo fonte é `.ts`, o specifier aponta para o emitido.

## Erros

`DomainError` é abstrata e carrega um `code` — **não** um HTTP status. Status é
transporte e mora na infraestrutura.

O mapeamento `code → status` vive em
`shared/infrastructure/http/error-handler.ts`. Um erro de domínio novo sem
mapeamento cai em 500 por padrão, o que é o comportamento seguro.

## Contrato HTTP

As rotas declaram schemas Zod, que servem a três propósitos de uma vez:

1. validação de entrada em runtime;
2. inferência de tipos no handler;
3. geração do documento OpenAPI (`/docs`).

O OpenAPI é a fonte da verdade para consumidores fora do TypeScript — ver
[monorepo.md](./monorepo.md#contrato-entre-linguagens).

## Estado atual e próximos módulos

Implementado como referência: **`editorial`** (`Post` + `Comment`).

Pendentes, em ordem:

1. **`auth`** — OAuth2/OIDC (GitHub/Google), sessão, papéis.
   Enquanto não existir, `requireActor` é um **stub que falha fechado**: lança
   erro se `NODE_ENV === 'production'`. Ver
   `shared/infrastructure/http/require-actor.ts`.
2. **`governance`** — audit log (`who`, `when`, `what`, `diff`), alimentado
   pelos domain events já emitidos pelos agregados.
3. **`media`** — upload, sanitização, storage.
