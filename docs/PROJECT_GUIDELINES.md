# PROJECT_GUIDELINES

Documento de referencia para desenvolvedores e agentes de IA do SmartCoreHub.
Este guia consolida as diretrizes dos arquivos Markdown canonicos de `Documentation/`
e define o padrao esperado para implementacoes novas e manutencao de codigo existente.

**Ultima alinhamento documental:** 2026-10-23 (stack homologada, recursos da plataforma, mensagens funcionais e MFA).

---

## Sumario

1. [Introducao](#1-introducao)
2. [Estrutura do repositorio](#2-estrutura-do-repositorio)
3. [Backend](#3-backend)
4. [Frontend](#4-frontend)
5. [Testes](#5-testes)
6. [Padroes Obrigatorios](#6-padroes-obrigatorios)
7. [Checklist Rapido](#7-checklist-rapido)
8. [Fontes Consolidadas](#8-fontes-consolidadas)

---

## 1. Introducao

### 1.1 Objetivo do documento

Centralizar as regras arquiteturais, tecnicas e funcionais do projeto em um unico ponto de consulta.
Leia este documento antes de criar entidades, repositorios, services, controllers, migrations, seeds,
paginas administrativas, casos CQRS ou testes.

### 1.2 Hierarquia de fontes

Quando houver conflito entre documentos:

1. **Codigo em `backend/` / `frontend/`** — fonte da verdade operacional.
2. **Este guia (`PROJECT_GUIDELINES.md`)** — regras transversais para implementacao.
3. **Specs ativas** em `Documentation/Features/` (fora de `FEITOS/`) — decisoes da feature em curso.
4. **`Documentation/Features/FEITOS/`** — historico de features concluidas; use como referencia, nao como mandato se contradisser o codigo.
5. **`Documentation/Outros/`** — material auxiliar; confirme atualidade antes de seguir.

Triangule decisoes com a feature afetada. Para Aspire + CQRS, o documento normativo e
[`SmartCoreHub-Aspire-CQRS-MediatR-Requisitos.md`](Features/SmartCoreHub-Aspire-CQRS-MediatR/SmartCoreHub-Aspire-CQRS-MediatR-Requisitos.md).

### 1.3 Hierarquia organizacional (dominio)

```text
Tenant (Locatario)
 ├── Applications (Aplicacoes)
 │    ├── ApplicationConfiguration
 │    ├── ApplicationTokens
 │    ├── ApplicationLanguages
 │    ├── CloudConfigurations
 │    └── Users (escopo Application)
 └── Users (escopo Tenant)
```

Regras fundamentais de escopo de usuario (IAM v3+):

| Modelo | Preferir |
| ---------------------- | ------------- |
| Perfil | `AccessProfileId` (1 por usuario); `UserDto.Role` e espelho de `ProfileType` (API) |
| Membership | `UserTenants` / `UserApplications` (N:N) via `TenantIds` / `ApplicationIds` no DTO |
| Colunas legado | `Users.Role` / `TenantId` / `ApplicationId` **removidas** (H1) |

AuthZ de recurso: Fluent `ResourceAccessRequest` no service **ou** `[RequireResourceAccess]` no controller (XOR).  
Guia de implementacao: [`FEATURE-USER-ACCESS-HOW-TO-IMPLEMENT.md`](Features/Done/UserAccess/FEATURE-USER-ACCESS-HOW-TO-IMPLEMENT.md).  
XOR Fluent vs Attribute: [`FEATURE-USER-ACCESS-AUTHZ-FLUENT-VS-ATTRIBUTE.md`](Features/Done/UserAccess/FEATURE-USER-ACCESS-AUTHZ-FLUENT-VS-ATTRIBUTE.md).

### 1.4 Principios gerais

- Manter Clean Architecture, SOLID e separacao clara de responsabilidades.
- Reutilizar as abstracoes genericas do `SmartCoreHub.Core.SDK` antes de introduzir novas estruturas.
- Nao expor entidades EF diretamente nos endpoints principais.
- Centralizar validacao, mapeamento, configuracao EF, seeds e internacionalizacao.
- Preferir evolucao incremental e compativel com dados existentes.
- Nunca versionar segredos reais em arquivos do repositorio.
- Toda chave lida de `appsettings` tem valor padrao utilizavel, salvo dado sensivel.
- Codigo e identificadores em ingles.
- Comentarios de codigo em portugues: XML-doc, comentarios de implementacao e comentarios de teste (`// Cenário:` e `// Objetivo:`).
- Mensagens executadas pelo sistema em ingles: `WithMessage` / `AddFailure`, logs, excecoes e retornos da API (`ServiceResponse.Message`, `ErrorResponse.Description`).
- Conteudo de uma cultura (recurso `pt-BR`, corpo de e-mail `pt-BR`) permanece no idioma daquela cultura. Esse texto nao substitui a mensagem de protocolo da API.

### 1.5 Governanca de modelo de dados (R-GOV-ENTITY)

**Proibido** criar, alterar, remover ou migrar entidades de dominio/EF, `DbSet`,
`IEntityTypeConfiguration`, ou migrations **sem perguntar ao usuario antes**, com justificativa clara.

Isso inclui clone duravel (store/worker/tabela de operacao): so avanca com aprovacao explicita.

### 1.6 Governanca de Controle de Versao e Git (R-GOV-GIT)

**Proibido** realizar `git commit`, `git push`, abertura de Pull Request (PR) ou criacao/alternancia de branches de forma autonoma ou automatica por assistentes ou ferramentas de IA.

- **Isolamento Local Obrigatorio:** Quaisquer alteracoes no codigo, documentacao, testes e saneamento de Code Smells devem permanecer estritamente no ambiente de trabalho local (*working directory* / *stage*).
- **Controle Exclusivo do Desenvolvedor:** A decisao, revisao de diffs, execucao de commits, criacao de branches, push para repositorios remotos e submissao de PRs sao de competencia e controle exclusivo do desenvolvedor humano ou mediante instrucao expressa e pontual deste.

---

## 2. Estrutura do repositorio

### 2.1 Mapa da raiz

```text
SmartCoreHub/
├── backend/                 # Solution .NET (SmartCoreHub.sln)
│   ├── APIs/                # SmartCoreHub.API e SmartCoreHub.Localization.API (+ Tests)
│   ├── Core/                # SmartCoreHub.Core.SDK (NuGet multi-TFM)
│   ├── Implementations/     # Domain, Infrastructure, Service (+ Tests)
│   ├── Orchestration/       # Aspire AppHost unificado + ServiceDefaults
│   ├── SDKs/                # Localization.SDK (+ console tests); Client.Cloud vive no Core.SDK
│   ├── MCP/                 # SmartCoreHub.Mcp e Localization.API.Mcp
│   ├── Directory.Packages.props
│   └── docker-compose.yml   # Compose principal das duas APIs
├── frontend/                # Painel admin Angular (TMS)
├── frontendsdk/             # SDK TypeScript / npm
├── landingpage/             # Landing React + exemplos SDK
├── infra/                   # Aspire READMEs, k8s/terraform quando aplicavel
├── azure-pipelines/         # CI/CD Azure DevOps
├── Documentation/           # Indice, PROJECT_GUIDELINES, CQRS, ASPIRE, Outros, Features
├── scripts/                 # Migrations, pipelines, utilitarios
├── docker-compose.yml       # Full stack (perfil production); Localization nao incluida
└── README.md                # Visao geral e inicio rapido
```

### 2.2 Camadas backend

| Camada | Projeto | Responsabilidade |
| ------ | ------- | ---------------- |
| Core.SDK | `backend/Core/SmartCoreHub.Core.SDK` | Primitivas genericas: CQRS contracts, cache, repositorios genéricos, JWT, OTel/health helpers, OpenAPI DI, middleware. Multi-TFM (`netstandard2.0` → `net10.0`). |
| Domain | `backend/Implementations/SmartCoreHub.Domain` | Entidades de produto, DTOs de dominio, FluentValidation, contracts de negocio. |
| Infrastructure | `backend/Implementations/SmartCoreHub.Infrastructure` | `SmartCoreHubDbContext`, repositorios, migrations, providers externos. |
| Service | `backend/Implementations/SmartCoreHub.Service` | Regras de negocio, handlers CQRS, composicao DI do host, branding SmartCoreHub. |
| APIs | `backend/APIs/*` | Hosts ASP.NET, controllers, `Program.cs`. |
| Orchestration | `backend/Orchestration/*` | AppHost Aspire + ServiceDefaults (composition layer). |
| SDKs / MCP | `backend/SDKs/*`, `backend/MCP/*` | Consumo externo e agentes. |

**Regra de fronteira:** o que for generico e independente do produto vai para o Core.SDK.
O Service nao deve virar dump de utilitarios reutilizaveis; o ServiceDefaults apenas compoe hosting Aspire.

### 2.3 Duas APIs

| API | Papel | Local HTTPS | Local HTTP |
| --- | ----- | ----------- | ---------- |
| `SmartCoreHub.API` | Plataforma (tenants, apps, planos, cloud, localization admin) | `https://localhost:53814` | `http://localhost:53815` |
| `SmartCoreHub.Localization.API` | Integracoes e recursos de localizacao (API Key / client) | `https://localhost:61115` | `http://localhost:61116` |

Deploy de producao: **Azure App Service via Azure DevOps**, publicacao **independente por API**.
Nao substituir esse fluxo por Aspire.

Rotas de saude:

| Rota | API principal | Localization API |
| ---- | ------------- | ---------------- |
| `/health` (liveness, sem banco) | Sim | Sim |
| `/ready` (readiness com banco) | Sim | Sim |
| `/health/ready` (alias) | Nao | Sim |

Documentacao OpenAPI compartilhada: `/swagger`, `/scalar/v1`, `/redoc`, `/rapidoc`, `/openapi/v1.json`.
Detalhes: [`README.md`](README.md) e
[`Features/FEITOS/API-DOCUMENTATION-UI.md`](Features/FEITOS/API-DOCUMENTATION-UI.md).

### 2.4 Aspire (opt-in)

- Existe **um unico** AppHost: `backend/Orchestration/SmartCoreHub.API.AppHost`.
- Sobe `smartcorehub-api` + `smartcorehub-localization-api` no mesmo dashboard.
- ServiceDefaults: `backend/Orchestration/SmartCoreHub.ServiceDefaults`.
- Pipeline: `azure-pipelines/aspire-api-ci.yml` (`trigger: none`).
- Secrets JWT **nao** passam por parametro Aspire; cada API usa `TokenConfigurations:Secret`.
- Guia multi-API: [`MULTIPLE-APIS.md`](ASPIRE/MULTIPLE-APIS.md).
- README: [`infra/aspire/smartcorehub-api/README.md`](../infra/aspire/smartcorehub-api/README.md).

```powershell
cd backend
$env:DatabaseProvider = 'INMEMORY'
dotnet run --project Orchestration\SmartCoreHub.API.AppHost\SmartCoreHub.API.AppHost.csproj
```

As APIs **continuam** rodando standalone (`dotnet run` / Docker) sem AppHost.

### 2.5 Docker / Compose (preferencia)

| Arquivo | Uso |
| ------- | --- |
| `backend/docker-compose.yml` | Principal: API `:80` + Localization `:8081` |
| `backend/APIs/SmartCoreHub.API/Dockerfile` | Build da API principal |
| `backend/APIs/SmartCoreHub.Localization.API/Dockerfile` | Build da Localization API |
| `docker-compose.yml` (raiz, perfil `production`) | Full stack opcional; **sem** Localization API |
| `backend/Dockerfile` | Legado; preferir Dockerfile por API |

Guia: [`General/Outros/DOCKER-AND-COMPOSE-GUIDE.md`](General/Outros/DOCKER-AND-COMPOSE-GUIDE.md).

### 2.6 Stack de referencia

| Area | Referencia |
| ---- | ---------- |
| .NET SDK | **10.0.300** (`backend/global.json`, `rollForward: latestFeature`) |
| ASP.NET Core | **10.0.13** |
| EF Core | **9.0.20** no host .NET 10. Pomelo MySQL 9 ainda nao publica provider para EF 10 |
| Banco default | MySQL (Pomelo **9.0.0**); tambem SQL Server, PostgreSQL (Npgsql **9.0.4**), InMemory e SQLite |
| Aspire Hosting | **13.6.2** |
| MediatR (adapter CQRS) | **12.5.0** (Apache 2.0); controllers nao referenciam MediatR |
| FluentValidation / AutoMapper | **12.2.0** / **16.2.0** (`ISmartCoreHubMapper`) |
| Angular | **22.2.x** (`frontend/package.json`); Material 22, PrimeNG 21, ngx-translate 17 |
| TypeScript / testes UI | TypeScript **6.0**, Jest **30** (nao Karma) |
| Node | `^22.22.3`, `^24.15.0` ou `>=26` (`engines` de `frontend/package.json`) |
| Landing | React **19**, Vite, i18next |
| Observabilidade | Serilog, Application Insights **3.2.0**, OpenTelemetry **1.20.x** |
| OpenAPI | Swashbuckle **10.3.1**, Scalar **2.18.2**, ReDoc, RapiDoc |
| Testes backend | NUnit **4.6.1**, Moq, AwesomeAssertions, Bogus, Coverlet, Testcontainers |

Pacotes centralizados em `backend/Directory.Packages.props` (CPM). As versoes acima foram lidas em 23/10/2026; o arquivo de pacotes continua sendo a fonte viva.

### 2.7 Recursos da plataforma

| Recurso | Onde vive |
| ------- | --------- |
| Autenticacao JWT, recuperacao de senha e MFA | `AuthController`, `MfaController`, tela `mfa-challenge` |
| API Key (`X-Auth-Token`), auditoria de token e metrica diaria | `ApplicationToken*`, `DailyUsageMetric` |
| IAM: usuarios, perfis, escopos e membership | `User`, `AccessProfile`, `Scope` |
| Tenants, aplicacoes, configuracao e planos | controllers de entidade e assinatura |
| Localizacao de conteudo do tenant | `LocalizationController` e `SmartCoreHub.Localization.API` |
| Mensagem funcional da API | `IFunctionalMessageProvider`; culturas `en-US`, `pt-BR`, `es-ES`; `X-Locale` vence `Accept-Language` |
| Idiomas da interface | `frontend/src/assets/i18n`: `pt-BR`, `en-US`, `es-ES`, `fr-FR`, `de-DE`, `ja-JP`, `zh-CN` |
| Templates de notificacao | `NotificationTemplateController` e `NotificationVariableController` |
| Nuvem | configuracao por aplicacao; Blob, Queue e Table; Redis, MongoDB e Cosmos no Core.SDK |
| Relatorios e IA | OpenXml, PDFsharp, QuestPDF, Semantic Kernel e conectores OpenAI, Ollama e Mistral no Core.SDK |
| MCP e extensoes de IDE | `backend/MCP` e projetos `*.IdeExtensions` |
| Orquestracao local | AppHost Aspire unico; deploy de producao continua no Azure App Service |

---

## 3. Backend

### 3.1 Entidades

- Toda entidade nova deve herdar de `BaseEntity`.
- Nao duplicar `Id`, `CreatedAt`, `UpdatedAt` ou `IsActive` nas entidades concretas.
- Regras de ativacao/desativacao devem usar a infraestrutura da classe base.
- O dominio deve refletir a hierarquia Tenant -> Application -> User.
- Qualquer mudanca estrutural exige aprovacao previa (secao 1.5).

#### Regras por entidade

| Entidade | Regras principais |
| -------- | ----------------- |
| Tenant | Raiz administrativa. Campos: `Name` (max 120), `Description` (max 500), `Applications`, `Users`. |
| Application | `TenantId` obrigatorio. Unicidade de `Name` por Tenant, nao global. |
| User | XOR entre `TenantId` e `ApplicationId`. Nunca ambos preenchidos nem ambos nulos. |
| ApplicationConfiguration | `ApplicationId` obrigatorio. Unicidade de `Name` por Application. Nao possui `TenantId` proprio; tenant vem de `Application.TenantId`. Metadados em JSON tipado com `SchemaVersion`. |
| Plan | `Code` unico global. `Rules` como objeto tipado persistido em JSON via EF `HasConversion`. |

#### Persistencia de dados estruturados em JSON

- Configuracoes flexiveis devem ser persistidas em JSON quando a feature pedir extensibilidade.
- Sempre incluir `SchemaVersion` no payload JSON para facilitar evolucao de contrato.
- Conversoes de JSON devem ficar centralizadas em `HasConversion` no EF.
- Fornecer classe tipada (ex.: `ApplicationConfigurationMetaData`, `PlanRules`) para serializar/deserializar.

---

### 3.2 Repositorios

- Todo repositorio especifico deve herdar de `GenericRepository<TEntity>`.
- Toda interface especifica deve herdar de `IGenericRepository<TEntity>`.
- CRUD, paginacao, ativacao e desativacao permanecem na base generica.
- Repositorios concretos adicionam apenas consultas de dominio especificas.

#### Responsabilidades aceitas em repositorios especificos

- `GetByNameAsync`, `NameExistsAsync`
- Consultas com `Include` necessarias para DTOs e regras de negocio
- Consultas filtradas por Tenant, Application ou estado quando nao cobertas pela base generica

#### Regras de consulta

- Incluir `Tenant` em consultas de `Application` quando o DTO precisar de `TenantName`.
- Incluir `Tenant` e `Application` em consultas de `User` quando o DTO precisar de `ScopeType`, `TenantName` e `ApplicationName`.
- Logica de negocio nunca deve ficar em repositorio.

#### Repositorio Dapper

O projeto possui `DapperAdpterGenericRepository<TEntity>` que implementa `IGenericRepository<TEntity>` com Dapper.
Use em cenarios de leitura intensiva, auditoria e escrita simples onde EF Core for excessivo.

- `UseReadUncommittedForReads` deve ser habilitado apenas para consultas nao criticas (relatorios, dashboards).
- SQL sempre parametrizado via `CommandDefinition`; nunca interpolar valores em SQL manual.
- Tabela inferida como `${TEntity}s`; pode ser sobrescrita no construtor.
- Escrita Dapper **fora** da atomicidade EF do `TransactionBehavior` CQRS.

---

### 3.3 Services

- Todo service de entidade CRUD deve herdar de `GenericService<TEntity>` quando o padrao generico se aplicar.
- Services trabalham com DTOs; nunca expor entidades EF diretamente.
- Mapeamento via `ISmartCoreHubMapper`, nao de implementacao concreta de AutoMapper.
- Validacoes de negocio concentradas nos overrides da base generica.
- Services modulares de Localization (Simple, AdvancedQuery, Mutation, ImportExport, SpecifiesOperations, etc.) sao o destino dos handlers CQRS — **nao** recriar facades orquestradoras.

#### Overrides esperados

- `ValidateBusinessRulesForCreationAsync`
- `ValidateBusinessRulesForUpdateAsync`
- `ValidateBusinessRulesForDeletionAsync`
- `ValidateBusinessRulesForDeactivationAsync`

#### Regras funcionais criticas por service

| Service | Responsabilidades adicionais |
| ------- | ---------------------------- |
| TenantService | Unicidade global de nome. Bloquear exclusao/desativacao com Applications ou Users ativos. |
| ApplicationService | Validar TenantId e Tenant ativo. Popular TenantName no DTO. Impedir troca de Tenant apos criacao. |
| UserService | Aplicar e revalidar regra XOR em criacao e atualizacao. Popular ScopeType no DTO. |
| ApplicationConfigurationService | Unicidade de Name por Application. Validar ApplicationId existente e ativo. |
| PlanService | Unicidade de Code global. Controle transacional na troca de plano de assinatura. |

---

### 3.4 CQRS e MediatR

Documento operacional: [`CQRS/CQRS.md`](CQRS/CQRS.md).

#### Contrato publico

- API unica de despacho: `IApplicationDispatcher` (`QueryAsync` / `SendAsync`).
- Controllers, MCP e consumidores **nao** referenciam `IMediator`, `ISender`, `IRequest<>` ou `IRequestHandler<>`.
- `TResult` e o **payload**; handlers retornam `ServiceResponse<TResult>`.
- MediatR 12.5.x e detalhe de adapter no Core.SDK; substituivel sem reescrever casos de uso.

#### Organizacao de pastas

| Dominio | Caminho |
| ------- | ------- |
| Localization | `SmartCoreHub.Service/Localization/Cqrs/<Grupo>/` |
| Billing / Metrics / Plans | `SmartCoreHub.Service/CqrsImplementations/<Dominio>/` |

Namespaces espelham as pastas (`SmartCoreHub.Service.Localization.Cqrs.*`, `SmartCoreHub.Service.CqrsImplementations.*`).

#### Como criar um caso de uso

1. Criar `record` `IQuery<TResult>` ou `ICommand<TResult>` (ou `ITransactionalCommand` se precisar de TX).
2. Criar handler `IQueryHandler<,>` / `ICommandHandler<,>` fino que chama o service modular.
3. No controller: `_dispatcher.QueryAsync(...)` ou `_dispatcher.SendAsync(...)`.
4. Nao registrar handler manualmente se o assembly ja for scaneado no bootstrap DI.

#### Pipeline de behaviors (ordem tipica)

1. UnhandledException
2. Logging / correlation
3. Performance
4. FluentValidation (quando aplicavel)
5. Transaction (`ITransactionExecutor`) apenas em commands transacionais

#### HTTP e excecoes

- Envelope padrao: `ServiceResponse<T>`.
- `BusinessException` → HTTP **422** Unprocessable Entity.
- Excecao documentada: endpoints especificos da Localization.API podem responder sem envelope.
- Hot path `LocalizationClientController` permanece **fora** do mediator (performance).

#### Estado-alvo Localization

```text
Controller/MCP → IApplicationDispatcher → Handler → serviço modular existente
```

A antiga `LocalizationOrchestrationFacadeService` foi removida; nao reintroduzir.

---

### 3.5 Controllers

- Receber DTOs de request e retornar `ServiceResponse<T>` (salvo excecoes documentadas).
- Seguir o padrao de `BaseApiController` e o estilo dos controllers existentes.
- CRUD generico: delegar ao `GenericService`.
- Fluxos complexos (Localization admin, billing/metricas migrados): delegar ao `IApplicationDispatcher`.
- Preservar atributos de autorizacao existentes (`[Authorize]`, API Key); nao introduzir fallback policy silenciosa.

#### Contratos de endpoint CRUD

| Verbo  | Endpoint                              | Descricao            |
| ------ | ------------------------------------- | -------------------- |
| POST   | `/api/{recurso}/search`               | Busca paginada       |
| GET    | `/api/{recurso}/{id}`                 | Busca por id         |
| POST   | `/api/{recurso}`                      | Criacao              |
| PUT    | `/api/{recurso}/{id}`                 | Atualizacao          |
| PATCH  | `/api/{recurso}/{id}/set-active`      | Ativacao/desativacao |
| DELETE | `/api/{recurso}/{id}`                 | Remocao              |

---

### 3.6 EF Core e Banco de Dados

- Cada entidade deve ter uma classe propria implementando `IEntityTypeConfiguration<TEntity>`.
- Configuracoes centralizadas; nao espalhadas no `DbContext`.
- Padrao minimo por configuracao:
  - `ToTable("NomeDaTabela")`
  - `HelperCharSet.AddCharSet(entity, DatabaseProviderType.MySql)` (helper e enum vem do `SmartCoreHub.Core.SDK`)
  - `HasKey(x => x.Id)` + `Property(x => x.Id).ValueGeneratedOnAdd()`
  - Indices nomeados com `HasDatabaseName`
- Utilitarios genericos de EF no `SmartCoreHub.Core.SDK`: `HelperCharSet`, `DatabaseProviderType`/`DatabaseProviderResolver`, `IDatabaseRoutineDefinition`, `DatabaseRoutineConfiguration`, `EfDbConnectionFactory<TContext>`, `IEfDbContextScope<>` / `EfDbContextScope<>`, `EfMigrationsHistoryHelper`, `DesignTimeDatabaseBootstrap`, constantes varchar/text de `EntityTypeConfigurationConstants`. O Infrastructure mantem o especifico de dominio (`SmartCoreHubDbContext*` + configurations + cadeias `Migrations/*`) e a casca DI `ISmartCoreHubDbScope` / `SmartCoreHubDbContextScope` (herda o Core; repos do host injetam a interface do host).
- Connection string principal: `ConnectionStrings:DefaultConnection`. Provedor: `DatabaseProvider` (`MySQL` | `PostgreSQL` | `SqlServer` | `INMEMORY`). `LocalizationMySql` e opcional e nao deve gerar check artificial de readiness enquanto o runtime nao consumir a string.
- Troca de provedor em runtime e geracao de migrations por cadeia: ver [`General/Outros/EF-MIGRATIONS-HOWTO.md`](General/Outros/EF-MIGRATIONS-HOWTO.md).

#### Regras especificas por entidade no banco

| Entidade | Indices e constraints |
| -------- | --------------------- |
| Tenant | Indice unico em `Name`. Indices em `IsActive` e `IsActive + CreatedAt`. |
| Application | `TenantId` obrigatorio. Indice unico composto `(TenantId, Name)`. |
| User | `TenantId` nullable. `ApplicationId` nullable. Check constraint XOR: `CK_Users_Scope_XorTenantApplication`. |
| ApplicationConfiguration | `ApplicationId` obrigatorio. Indice unico composto `(ApplicationId, Name)`. FK com cascade delete. Sem coluna `TenantId` na tabela. |

- Relacionamentos de `User` e `Application` com `Tenant` devem usar `DeleteBehavior.Restrict`.

#### DbContext e Seeds

- Registrar `DbSet<T>` e `ApplyConfiguration(new TEntityConfiguration())` para cada nova entidade (apos aprovacao R-GOV-ENTITY).
- Seeds devem ser centralizados e consistentes com constraints e regras atuais.
- O Tenant default deve existir antes de tornar `Application.TenantId` obrigatorio.
- Usuario admin do seed deve ser usuario de Tenant: `TenantId = 1`, `ApplicationId = null`.

---

### 3.7 Mapeamento

- Usar sempre `ISmartCoreHubMapper` como contrato; nunca acoplar diretamente a `IMapper`.
- Toda configuracao centralizada em `AutoMapperProfile`.

#### Mapeamentos obrigatorios por feature

- `Tenant -> TenantDto` (incluindo `ApplicationsCount` e `UsersCount`)
- `CreateTenantDto -> Tenant`, `UpdateTenantDto -> Tenant`
- `Application -> ApplicationDto` com `TenantName` de `src.Tenant.Name`
- `User -> UserDto` com `TenantName`, `ApplicationName` e `ScopeType`

#### ScopeType

- `"Tenant"` quando `TenantId` estiver preenchido.
- `"Application"` quando `ApplicationId` estiver preenchido.

---

### 3.8 Validacao e i18n

- Toda validacao via FluentValidation. Validators localizados em `Domain/Validators` (organizados por subpasta/contexto funcional).
- Services convertem `ValidationFailure` usando `ValidationErrorMapperHelper.MapAsync(...)`.
- Mensagem funcional da API usa `IFunctionalMessageProvider`. Conteúdo de tenant continua em `ILocalizationProvider` / `SmartCoreHub.Localization.API`. Os dois planos não compartilham chave.
- `ErrorCode` sintético (`SmartCoreHub.Domain.*.RuleN`) identifica a regra. A tradução usa `MessageKey` no formato `SmartCoreHub.Core.SDK.{Arquivo}.{Identificador}` ou `SmartCoreHub.Infrastructure.{Arquivo}.{Identificador}`, por exemplo `SmartCoreHub.Core.SDK.Validation.RequiredField` e `SmartCoreHub.Infrastructure.Notification.TemplateUpdated`. O `data name` do RESX é essa chave inteira. `SmartCoreHub.Domain.*`, `SmartCoreHub.Auth.*` e `SmartCoreHub.AuthZ.*` não são chave.
- No pipeline CQRS, validacao ocorre via behavior quando o contrato for suportado.
- Guia de uso: [`04-GUIA-DE-USO-E-IMPLEMENTACAO.md`](Features/Pendding/PADRONIZACAO-IDIOMA-I18N-E-CENTRALIZACAO-MENSAGENS/04-GUIA-DE-USO-E-IMPLEMENTACAO.md).

#### Padrao Obrigatorio de Validadores (FluentValidation)

1. **Declaracao e Heranca:**
   - A classe deve ser publica e herdar de `AbstractValidator<TDto>` (ex.: `public class CreateUserDtoValidator : AbstractValidator<CreateUserDto>`).
   - Deve conter XML-doc no tipo e no construtor descrevendo o contrato validado:
     ```csharp
     /// <summary>
     /// Valida o contrato <see cref="CreateUserDto"/> antes de seu uso pelos serviços de domínio.
     /// </summary>
     public class CreateUserDtoValidator : AbstractValidator<CreateUserDto>
     {
         /// <summary>
         /// Inicializa uma nova instância de <see cref="CreateUserDtoValidator"/>.
         /// </summary>
         public CreateUserDtoValidator() { ... }
     }
     ```

2. **Regras, Mensagens e ErrorCode Estruturado:**
   - Toda regra individual com `RuleFor(...)` **deve obrigatoriamente** declarar `.WithMessage("...")`, `.WithErrorCode("...")` e `.WithMessageKey(...)`.
   - O texto de `.WithMessage("...")` e de `AddFailure` e sempre em ingles. O XML-doc do validador continua em portugues.
   - `.WithMessageKey` grava a chave em `ValidationFailure.CustomState`. A mesma chave existe no `.resx` neutro (inglês) e nos satélites `pt-BR` e `es-ES`.
   - A tríade vale só para o validador imediatamente anterior. Repita-a em `NotNull` quando a regra seguinte também tiver mensagem.
   - Padrao canonico de chave:
     ```text
     SmartCoreHub.Domain.{ValidatorName}.Field.{FieldName}.Rule{N}
     ```
   - Para validacoes de objeto raiz / cross-property (`RuleFor(x => x)`), utilizar `.WithErrorCode("SmartCoreHub.Domain.{ValidatorName}.Field.{Categoria}.{Regra}")` (ex.: `.Membership.Xor`, `.Scope.Rule1`, `.NewPassword.Rule8`).
   - Exemplo completo:
     ```csharp
     RuleFor(x => x.Email)
         .NotEmpty().WithMessage("Email is required.")
         .WithErrorCode("SmartCoreHub.Domain.ForgotPasswordRequestDtoValidator.Field.Email.Rule1")
         .WithMessageKey(ValidationMessageKeys.RequiredField)
         .EmailAddress().WithMessage("Email format is invalid.")
         .WithErrorCode("SmartCoreHub.Domain.ForgotPasswordRequestDtoValidator.Field.Email.Rule2")
         .WithMessageKey(ValidationMessageKeys.InvalidEmail)
         .MaximumLength(191).WithMessage("Email cannot exceed 191 characters.")
         .WithErrorCode("SmartCoreHub.Domain.ForgotPasswordRequestDtoValidator.Field.Email.Rule3")
         .WithMessageKey(ValidationMessageKeys.MaximumLength);
     ```

3. **Conformidade com a Suite de Testes Genericos (`AllValidatorsGenericTests`):**
   - Todos os validadores de `SmartCoreHub.Domain` sao descobertos e testados reflexivamente pela classe `AllValidatorsGenericTests` em `SmartCoreHub.Domain.Tests`.
   - Se o validador possuir regras condicionais restritivas (ex.: regex de senha, confirmacao cruzada, campos unicos), deve-se registrar amostras validas e invalidas no metodo `CreateSamples(...)` de `AllValidatorsGenericTests.cs`.

4. **Testes Unitarios Dedicados:**
   - Criar classe de testes `{ValidatorName}Tests` em `SmartCoreHub.Domain.Tests/Validators/`.
   - Usar `FluentValidation.TestHelper` (`TestValidate()`).
   - Validar casos felizes com `.ShouldNotHaveAnyValidationErrors()`.
   - Validar falhas conferindo campo e codigo de erro: `.ShouldHaveValidationErrorFor(x => x.Campo).WithErrorCode("SmartCoreHub.Domain.{ValidatorName}.Field.{Campo}.Rule{N}")`.

#### Regras obrigatorias de validacao

- `Application.TenantId` maior que zero quando obrigatorio.
- `CreateUserDto` e `UpdateUserDto` devem validar XOR entre `TenantId` e `ApplicationId`.
- A regra XOR deve ser validada em DTO validator, service e banco de dados (check constraint).

#### Localizacao — paridade import/export (conteúdo de tenant)

Este bloco é o plano de conteúdo. Não use estas chaves de arquivo como `MessageKey` funcional.

- `LocalizationImportFileFormat` e `LocalizationExportFileFormat` devem ter **os mesmos IDs e status** (`IsImplemented()` sincronizado).
- Todo parser de import implementado exige **formatter de export no mesmo ciclo de release**.
- Specs: [`Localization-Import-I18n-Formats-Spec.md`](Features/FEITOS/Localization-Import-I18n-Formats-Spec.md) e
  [`Localization-Export-I18n-Formats-Spec.md`](Features/FEITOS/Localization-Export-I18n-Formats-Spec.md).
- Export usa `ILocalizationExportFormatterRegistry`; import usa `ILocalizationFileParserRegistry`.
- `ExportCriteriaDto.Format` e o contrato preferido; `FileType` / `ExportFileType` permanecem obsoletos para compatibilidade (`JSON_ANGULAR` → `JsonNested`).
- Erros de formato roadmap: `SmartCoreHub.Domain.ExportCriteriaDtoValidator.Field.Format.FormatterNotImplemented`.
- Teste obrigatorio: `LocalizationImportExportFormatParityTests` no projeto `Implementations/SmartCoreHub.Domain.Tests`.

---

### 3.9 Logging

- Toda camada deve depender de `IAppLogger` (interface propria do projeto).
- Nunca acoplar diretamente a `ILogger<T>` fora da borda de infraestrutura.
- Para parametros opcionais de logger, usar `NullAppLogger.Instance` como default.
- O adapter `SerilogAdapter` (no `SmartCoreHub.Core.SDK`, banda net8/net10) e o unico tipo do ecossistema que deve conhecer o Serilog; o restante do codigo usa `IAppLogger`.

#### Mapeamento de metodos

| `ILogger<T>` (MEL)       | `IAppLogger`              |
| ------------------------ | ------------------------- |
| `LogInformation(...)`    | `LogInfo(...)`            |
| `LogError(ex, ...)`      | `LogError(ex, ...)`       |
| `LogError(...)`          | `LogError(...)`           |
| `LogWarning(...)`        | `LogWarning(...)`         |
| `LogDebug(...)`          | `LogDebug(...)`           |
| `NullLogger<T>.Instance` | `NullAppLogger.Instance`  |

#### Regras de seguranca em logs

- Logs nao devem expor passwords, connection strings, tokens ou secrets equivalentes.
- Logar em `LogWarning` quando header de idioma ou qualquer entrada de usuario for invalida.
- Correlation: `X-Correlation-ID` / tag `correlation.id` em Activity quando OTel ativo.

---

### 3.10 Migrations

- Usar nomes descritivos em PascalCase (sufixo `_PostgreSql` / `_SqlServer` quando a cadeia nao for MySQL).
- Mudancas de schema exigem aprovacao R-GOV-ENTITY (secao 1.5).
- **Sempre** informar `--context` e `--output-dir` do provedor; nao copiar Designer/Snapshot entre pastas.
- Cadeias: `Migrations/MySql` → `SmartCoreHubDbContextMySql`; `Migrations/SqlServer` → `SmartCoreHubDbContextSqlServer`; `Migrations/PostgreSql` → `SmartCoreHubDbContextPostgreSql`.
- Historico EF por provedor via `EfMigrationsHistoryHelper` (tabelas distintas para SQL Server e PostgreSQL).
- Guia operacional (criar, aplicar, **trocar para PostgreSQL**, ETL): [`General/Outros/EF-MIGRATIONS-HOWTO.md`](General/Outros/EF-MIGRATIONS-HOWTO.md).

Script recomendado:

```powershell
./scripts/create-migration.ps1 -MigrationName "NomeDaMigration" -DatabaseProvider "PostgreSQL"
./scripts/create-migration.ps1 -MigrationName "NomeDaMigration" -DatabaseProvider "PostgreSQL" -UpdateDatabase
```

CLI PostgreSQL (a partir da pasta `backend/`):

```sh
dotnet ef migrations add NomeDaMigration_PostgreSql \
  --project Implementations/SmartCoreHub.Infrastructure/SmartCoreHub.Infrastructure.csproj \
  --startup-project APIs/SmartCoreHub.API/SmartCoreHub.API.csproj \
  --context SmartCoreHubDbContextPostgreSql \
  --output-dir Migrations/PostgreSql \
  -- --environment Development
```

#### Estrategia Expand/Enforce para mudancas estruturais

| Etapa | Acoes |
| ----- | ----- |
| Stage 1 — Expand | Criar tabelas/colunas novas como nullable. Inserir seed/backfill. |
| Stage 2 — Enforce | Tornar colunas NOT NULL. Criar FKs, indices unicos e check constraints. |

#### Rotinas SQL multi-banco

- Usar `IDatabaseRoutineDefinition` para encapsular SQL por provider.
- Usar `MigrationBuilderRoutineExtensions` para aplicar `Up`/`Down` sem duplicar `if` por provider.

---

### 3.11 Configuracao, Segredos e Ambiente

- Toda chave que o codigo le de `appsettings` existe no `appsettings.json` principal e na classe tipada.
- Valor nao sensivel nasce com padrao utilizavel nos dois lugares: numero, URL, nome, flag, timeout, chave de template. Deploy sem a variavel de ambiente nao pode cair por campo vazio.
- Dado sensivel nao recebe segredo real no arquivo versionado. Ficam vazios: connection string, senha, `TokenConfigurations:Secret`, API key e senha SMTP. O valor real entra por variavel de ambiente, User Secrets ou Azure App Settings.
- Se a validacao de subida exige formato minimo de um campo sensivel, o `appsettings.json` leva um placeholder nao produtivo que passa na validacao. Producao substitui com `Section__Key`. O placeholder nao e segredo de producao. Exemplo: `ApplicationSettings:TemporaryPasswordPepper`.
- Padrao canonico: `Section:SubSection:Key` -> `Section__SubSection__Key`. A variavel de ambiente sobrescreve o padrao do arquivo.
- `.env.example` deve conter apenas placeholders; `.env` real em `.gitignore`.
- Compose/AppHost de desenvolvimento nao podem documentar secrets previsiveis como aceitaveis em producao.

#### Variaveis criticas

| Variavel | Dev | Prod |
| -------- | --- | ---- |
| `ConnectionStrings__DefaultConnection` | Sim | Sim |
| `TokenConfigurations__Secret` | Sim | Sim |
| `ApplicationSettings__TemporaryPasswordPepper` | Opcional; ha placeholder | Sim, substituir o placeholder |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Nao | Recomendado |
| `CacheConfig__ProviderOptions__Redis__ConnectionString` | Se Redis ativo | Se Redis ativo |
| `OTEL_EXPORTER_OTLP_ENDPOINT` / `OpenTelemetry:OtlpEndpoint` | Opt-in | Opt-in |

---

### 3.12 Infraestrutura HTTP e Observabilidade

| Middleware | Responsabilidade |
| ---------- | ---------------- |
| Application Insights | Telemetria de requests, dependencias e excecoes. Usar sampling em producao. Nao trafegar dados sensiveis. |
| OpenTelemetry | Traces/metrics opt-in via OTLP; coexistir com Serilog/App Insights sem double-export de logs. |
| ResponseCompression | Compressao Brotli/Gzip para tipos adequados. Nao comprimir binarios ja comprimidos. |
| RateLimiter | Limite por IP (padrao inicial). Pode evoluir para politicas por usuario ou chave. Incluir `Retry-After` nas respostas 429. |
| SecurityHeadersMiddleware | HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection. Nao habilitar HSTS em Dev. |
| CorrelationIdMiddleware | Ler ou gerar `X-Correlation-ID`. Propagar para logs, resposta e `Activity.Current`. |

Composicao do host: fachadas finas no Service + extensions reutilizaveis no Core.SDK
(`AddServiceDefaults` / `MapDefaultEndpoints` nos `Program.cs` das APIs).

#### Suporte a locale via header (Localization API)

- Prioridade: `X-Locale` > primeiro token de `Accept-Language` > cultura default do servidor.
- Validar valor com `new CultureInfo(parsed)`; se invalido, logar `LogWarning` e ignorar.
- Alteracao de cultura e por request; nao usar `DefaultThreadCurrentCulture`.
- Adicionar `X-Locale` em `Access-Control-Allow-Headers` quando consumido por clientes browser.

#### Validacao operacional

- Confirmar headers de seguranca na resposta.
- Confirmar `Content-Encoding` quando compressao habilitada.
- Confirmar comportamento 429 quando rate limiting for atingido.
- Confirmar presenca e propagacao de `X-Correlation-ID`.
- Confirmar `/health` 200 sem banco e `/ready` coerente com dependencia habilitada.

---

### 3.13 Cache

Arquitetura de cache plugavel com tres camadas: Domain (contratos), Service (orquestracao), Infrastructure (providers).
Implementacoes genericas residem no Core.SDK.

#### Providers disponiveis

- `MemoryCacheProvider`, `RedisCacheProvider`, `DiskCacheProvider`, `MongoDbCacheProvider`, `AzureCosmosDbCacheProvider`

#### Boas praticas

- Registrar via `builder.Services.AddServiceCollectionCaching(builder.Configuration)`.
- Habilitar `FallbackToMemoryOnConnectionFailure` em staging e producao.
- Configurar `SizeLimit` em `MemoryCacheProvider`.
- Strings de conexao de cache sao secrets; seguir secao 3.11.
- No AppHost Aspire, Redis so sobe com `CacheConfig:Enabled=true` e `CacheConfig:Provider=Redis`.

---

### 3.14 API Key Authentication

Sistema de autenticacao por API Key para cenarios Server-to-Server (header `X-Auth-Token`).

- Formato do token: `ak_live_<prefix>_<secret>`.
- `TokenPrefix` indexado para lookup rapido sem full-scan de hash.
- Hash recomendado: `HMACSHA512` com salt unico por token.
- Comparacao via `CryptographicOperations.FixedTimeEquals` para evitar timing attacks.
- `LastUsedAt` atualizado assincronamente no maximo a cada 15 minutos.
- Auditoria obrigatoria por `TokenAudit` (TokenId, Timestamp, ClientIP, RequestPath, UserAgent, StatusCode).
- Metricas diarias agregadas via plataforma generica `DailyUsageMetric` (`IDailyUsageMetricRecorder` + Dapper upsert no hot path; consultas admin via EF em `/api/usage-metrics/*`).
- Primeiro publisher: autenticacao ApiKey (`api_key.auth.success`, escopo `ApiKeyToken`); falhas de metrica nao bloqueiam autenticacao.
- Token Manager: botoes **Ver logs** (`TokenAudit`) e **Ver metricas** (`DailyUsageMetricSearchDto` com filtros do token).

#### Regras de ouro

- Nunca logar token completo.
- Nunca retornar o token apos a criacao (exibir apenas uma vez).
- Sempre usar HTTPS.
- Rate limit por IP e por token.

---

### 3.15 MCP

- Projetos em `backend/MCP/` para integracao com agentes de IA.
- Consumidores MCP devem preferir o mesmo caminho CQRS (`IApplicationDispatcher`) quando o fluxo ja estiver migrado.
- Specs: [`Features/MCP/`](Features/MCP/).

---

## 4. Frontend

### 4.1 Services

- Todo service HTTP de feature deve herdar de `BaseApiService<T, TCreate, TUpdate>`.
- Nao duplicar infraestrutura de `HttpClient`, rotas CRUD ou chamadas utilitarias.
- Search paginado usando `customPost` para o endpoint `/search`.
- Services devem consumir o contrato `ServiceResponse<T>` da API.

---

### 4.2 Formularios

- Formularios devem usar `ReactiveFormsModule`.
- `ApplicationForm` deve exigir `TenantId` obrigatorio em criacao e edicao.
- `UserForm` deve permitir selecao de escopo entre Tenant e Application.

| Escopo selecionado | Acao no formulario |
| ------------------ | ------------------ |
| Tenant | Habilitar `TenantId`. Limpar e desabilitar `ApplicationId`. |
| Application | Habilitar `ApplicationId`. Limpar e desabilitar `TenantId`. |

- Validacao local deve espelhar a regra do backend sem substituir mensagens localizadas da API.

#### Diretriz para Dropdowns e Seletores (Nunca Deixar Dropdown Vazio quando houver Opção Padrão)

- **Regra Mandatória**: Se um campo de seleção (seja `mat-select`, `<select>` ou `app-searchable-select`) possui uma opção padrão (*default*), **nunca deixe o dropdown vazio** (`null`, `undefined` ou string vazia).
- **Inicialização**: Ao instanciar o `FormGroup` reativo, inicialize o controle sempre com o valor da opção padrão configurada (ex: `'None'`, `0`, ou o enum/string default), em vez de `[null]`.
- **Carregamento / Edição (`patchValue`)**: Ao carregar dados da API ou fontes externas, caso o valor venha nulo, indefinido ou vazio, o normalizador (`normalizeXxx`) ou o `patchValue` deve aplicar o fallback para o valor padrão, assegurando que o seletor exiba a opção selecionada correspondente e nunca um campo em branco.
- **Valores das Opções**: Evite associar `[value]="null"` a opções com rótulo descritivo quando o componente de UI tratar `null` como estado "não preenchido/vazio" (como ocorre nativamente no `mat-select` do Angular Material). Use valores semânticos explícitos (ex: `'None'`, `'Default'`).
- **Feedback Visual**: O usuário deve ver claramente qual opção está ativa por padrão desde a renderização inicial do formulário.

#### Diretriz para Envio de Enums ao Backend (Valor Numérico Obrigatório)

- **Regra Mandatória (R-FE-ENUM-NUMERIC)**: Em toda e qualquer implementação nova ou refatoração no Frontend, quando um endpoint da API backend esperar receber um `enum` C# (ex.: `ECompressionType`, `ECryptoServiceType`, `CacheLocation`, etc.), o payload JSON enviado pelo Frontend **deve obrigatoriamente trafegar o valor numérico inteiro** (`0, 1, 2, ...`) e **nunca o nome textual/string** (`"Brotli"`, `"None"`, etc.).
- **Motivação**: O `System.Text.Json` no backend .NET opera nativamente com representação inteira para enums. O tráfego estritamente numérico elimina a necessidade de conversores customizados redundantes (`JsonConverter`), previne erros `400 Bad Request` (`JsonException`), garante total compatibilidade com colunas JSON de banco de dados e snapshots de migração EF Core, além de padronizar os contratos entre Angular e .NET.
- **Modelagem no Frontend (`.model.ts`)**:
  - Declarar os enums TypeScript espelhando exatamente os inteiros do backend:
    ```typescript
    export enum ECompressionType {
      None = 0,
      Brotli = 1,
      GZip = 2,
      Zstd = 3
    }
    ```
  - As listas de opções para dropdowns (`mat-select`, `<select>`) devem associar inteiros no `value`:
    ```typescript
    export const COMPRESSION_TYPE_OPTIONS = [
      { value: ECompressionType.None, labelKey: 'applicationConfigurationForm.compression.none' },
      { value: ECompressionType.Brotli, labelKey: 'applicationConfigurationForm.compression.brotli' }
    ];
    ```
- **Montagem do Payload (`buildPayload` / `buildMetaData`)**:
  - Tratar a falsidade lógica do zero (`0`) no JavaScript/TypeScript: utilize `formValue.property !== null && formValue.property !== undefined && formValue.property !== '' ? Number(formValue.property) : undefined` em vez de `formValue.property || undefined` (pois `0 || undefined` avalia incorretamente para `undefined`).
- **Normalizadores (`normalizeXxx`)**:
  - Ao carregar dados da API, converta strings ou números para o inteiro tipado correspondente, garantindo integridade bidirecional no formulário reativo.

---

### 4.3 Listas e Telas Administrativas

- Listas de `Application` devem exibir `TenantName`.
- Listas de `User` devem exibir `ScopeType` e `TenantName` ou `ApplicationName` conforme o escopo.
- Oferecer filtro por Tenant e por Application quando fizer sentido funcional.

---

### 4.4 UX e i18n

- Labels, hints, titulos e mensagens de erro devem usar o mecanismo atual de traducao.
- Nao introduzir textos fixos para novos campos de Tenant ou de escopo do usuario.
- Reutilizar `TranslatePipe`, `TranslationAppService` ou `TranslateService` conforme o padrao ja presente.
- Mensagens localizadas retornadas em `ServiceResponse.Errors` devem ser exibidas ao usuario.

#### Chaves de i18n esperadas para Tenant e escopo

- `tenant.form.title.create`, `tenant.form.title.edit`
- `tenant.list.column.applicationsCount`
- `tenant.validation.cannotDeleteWithApplications`
- `users.form.scopeType`, `users.form.tenantLabel`
- `applicationForm.tenantLabel`

#### Dialog de exportacao de localizacao

- Selecao por **extensao** (`.json`, `.resx`); default `.json` → `JsonNested`.
- Checkbox **Opcoes avancadas** apenas para `.json`; variantes flat/nested via `resolveExportFormat()` (`localization-export-format.resolver.ts`).
- Payload API: `format` (`LocalizationExportFileFormat`); historico exibe o formato real exportado.
- Campo opcional `resourceKeyPrefix` no dialog, listas, explorer, clone app e clone idioma; omitido = comportamento legado (todas as chaves).

#### Filtro `ResourceKeyPrefix` (localizacao)

- Propriedade opcional em `LocalizationSearchDto`, `ExportCriteriaDto`, `LocalizationCloneRequestDto`, `LocalizationCloneLanguageRequestDto` e `ResourcesCriteriaDto`.
- Semantica: vazio/ausente = sem filtro; valor trimado = `ResourceKey.StartsWith(prefix, OrdinalIgnoreCase)`.
- Validacao compartilhada: `LocalizationResourceKeyPrefixValidatorExtensions.ValidateResourceKeyPrefix()` (max 256 caracteres; nao pode ser so whitespace).
- `ErrorCode`: `SmartCoreHub.Domain.ResourceKeyPrefix.Field.ResourceKeyPrefix.MaxLength` e `.Invalid`.
- Backend: helper `LocalizationResourceKeyPrefixFilterHelper` em `SmartCoreHub.Service.Localization.Helpers` (regra de negocio no service; Domain mantem DTOs/contratos/validators). Filtro aplicado no service apos `ListResources` (busca, export, clone); providers/repositorios permanecem sem parametro de prefixo.
- Logs estruturados em busca/export/clone: `ApplicationId`, `TenantId` (quando resolvido), `ResourceKeyPrefix`, contagens — sem expor valores de traducao.

---

### 4.5 Estrutura de Feature

```text
src/app/features/{feature}/
├── models/
│   └── {feature}.model.ts
├── services/
│   └── {feature}.service.ts
├── {feature}-list/
│   ├── {feature}-list.component.ts
│   └── {feature}-list.component.html
└── {feature}-form/
    ├── {feature}-form.component.ts
    └── {feature}-form.component.html
```

Reutilizar componentes de formulario, toasts, tabelas e confirmacoes sempre que possivel.

---

### 4.6 Loading Global HTTP

- Loading global em modo opt-in; requests nao abrem loading automaticamente.
- O interceptor exibe loading global apenas quando a request carregar `ENABLE_GLOBAL_LOADING = true`.
- Para evitar loading global, usar `SKIP_GLOBAL_LOADING = true`.
- Para CRUD comum, uploads e operacoes de tela, preferir loading local da feature.

---

### 4.7 Versoes de stack (Angular, Node, TypeScript)

- A referencia viva de Angular e `frontend/package.json`. O conjunto registrado em [2.6](#26-stack-de-referencia) foi lido em 23/10/2026 (Angular 22.2, Jest 30).
- Demais documentos Markdown devem apontar para `frontend/package.json` ou `npx ng version` quando a versao puder mudar.
- Node.js: usar `engines` nos `package.json` dos projetos Angular e da SDK.
- Politica de upgrade e registro historico: [`Features/FEITOS/angular-update-22-spec.md`](Features/FEITOS/angular-update-22-spec.md).

---

### 4.8 Componentes Compartilhados de Seleção e Busca (Searchable Selects)

Para manter a consistência visual, acessibilidade e evitar a re-invenção de código ao implementar seletores com filtragem interativa, **utilize sempre os componentes compartilhados oficiais** localizados em `src/app/shared/components/`:

#### 1. Seleção Única com Busca: `SearchableSelectComponent` (`<app-searchable-select>`)
- **Localização**: `src/app/shared/components/searchable-select/`
- **Contrato de Opção**: `SearchableSelectOption<T>` (`value: T`, `label: string`, `icon?: string`, `secondaryText?: string`, `disabled?: boolean`, `searchTerms?: string[]`).
- **Integração com Formulários**: Suporta `ControlValueAccessor` (`formControlName`, `formControl`, `ngModel`) ou Signals reativos (`[value]`, `(valueChange)`).
- **Recursos Nativos**:
  - Campo de busca sticky no topo do painel dropdown com foco automático na abertura.
  - Filtragem reativa instantânea por rótulo, valor, texto secundário e termos alternativos (`searchTerms`).
  - Renderização opcional de ícones Material e rótulos secundários tanto no item quanto no trigger do select.
  - Opção de limpeza rápida com botão `[clearable]="true"`.
  - Suporte completo e dinâmico aos temas Claro e Escuro (CSS design tokens).
- **Exemplo de Uso**:
  ```html
  <app-searchable-select
    [options]="resourceSelectOptions()"
    [value]="selectedResourceToAdd()"
    [label]="'applicationTokenManager.selectResource' | translate"
    [searchPlaceholder]="'applicationTokenManager.searchModulePlaceholder' | translate"
    [noResultsText]="'applicationTokenManager.noModulesFound' | translate"
    (valueChange)="selectedResourceToAdd.set($event ?? '')">
  </app-searchable-select>
  ```

#### 2. Múltipla Seleção com Busca: `SearchableMultiSelectComponent` (`<app-searchable-multi-select>`)
- **Localização**: `src/app/shared/components/searchable-multi-select/`
- **Contrato de Opção**: `MultiSelectOption` (`value: string`, `label: string`, `leadingText?: string`, `searchTerms?: string[]`).
- **Integração**: `[options]`, `[selectedValues]`, `(selectedValuesChange)`.
- **Exemplo de Uso**: Seleção de múltiplos idiomas, tags ou filtros combinados em listagens administrativas.

---

### 4.9 Governança Estrita de Templates (HTML e SCSS Separados)

**Regra mandatória para qualquer componente novo ou refatorado no Frontend:**

- **Proibido template inline (`template: \`...\``)**: Todo e qualquer componente Angular (inclusive componentes utilitários pequenos, dialogs, modais, badges ou cards) **deve obrigatoriamente utilizar arquivo de template HTML separado (`templateUrl`)**.
- **Folha de estilo separada**: Sempre que o componente demandar estilização específica, deve utilizar arquivo `.scss` dedicado referenciado via `styleUrls: ['./{nome}.component.scss']` (ou `styleUrl`).
- **Estrutura canônica de arquivos por componente**:
  ```text
  meu-componente/
  ├── meu-componente.component.ts      # Apenas lógica TypeScript, imports, signals, inputs/outputs e DI
  ├── meu-componente.component.html    # Markup semântico, diretivas (*appHasPermission, @if) e i18n
  ├── meu-componente.component.scss    # Estilos encapsulados com tokens de design e temas
  └── meu-componente.component.spec.ts  # Testes unitários com TestBed
  ```
- **Justificativas Técnicas e Benefícios**:
  1. **Separação de Responsabilidades**: Desacopla a lógica reativa (Signals, lifecycle, chamadas de serviço) da estrutura visual e de layout.
  2. **Ferramental e Linting**: Permite que formatadores (Prettier), linters de template (ESLint Template), verificações de acessibilidade (a11y) e o Angular Language Service analisem e autocompletem o HTML com máxima precisão e performance de compilação AOT.
  3. **Auditoria de Segurança e i18n**: Facilita varreduras estáticas de conformidade para permissões (`*appHasPermission`, `canWrite()`) e chaves de internacionalização (`'chave' | translate`).
  4. **Padronização do Ecossistema**: Garante 100% de uniformidade na base de código do monorepo, evitando fragmentação entre componentes com templates inline e externos.
- **Validação de Regressão**:
  Nenhum arquivo `.ts` em `frontend/src/app` deve conter a declaração `template:`. O projeto mantém conformidade estrita com zero ocorrências de inline HTML.

---

### 4.10 Padrão de Listas Administrativas com Separação de Filtros e Data Grid (`ListFilterComponent` e `DataGridComponent`)

Para todas as novas funcionalidades que implementarem listagens administrativas (`{feature}-list`), **é obrigatório manter a separação estrita de responsabilidades entre filtros, orquestração e renderização de grade de dados**, eliminando código duplicado e adotando Clean Code e padrões de projeto consolidados:

#### 1. Arquitetura Canônica da Tela de Listagem (Separação em 3 Componentes)
A tela de listagem administrativa não deve concentrar filtros, paginação e tabela em um único arquivo de componente ou template. Deve ser estruturada em:

```text
src/app/features/{feature}/{feature}-list/
├── {feature}-list.component.ts          # Orquestrador da página: gerencia estado da busca, paginação, chamadas ao service HTTP e dialogs
├── {feature}-list.component.html        # Declara <app-{feature}-list-filter> e <app-data-grid> (ou <app-tanstack-table>)
├── {feature}-list.component.scss
├── components/
│   └── {feature}-list-filter/           # Componente isolado e dedicado exclusivamente aos filtros da feature
│       ├── {feature}-list-filter.component.ts
│       ├── {feature}-list-filter.component.html   # Reutiliza o componente genérico <app-list-filter>
│       ├── {feature}-list-filter.component.scss
│       └── {feature}-list-filter.component.spec.ts
```

#### 2. Reuso Obrigatório do `ListFilterComponent` (`<app-list-filter>`)
Todo componente `{feature}-list-filter` **deve reutilizar o componente genérico oficial** `<app-list-filter>` localizado em `src/app/shared/components/list-filter/`:

- **Responsabilidade do `ListFilterComponent`**: Encapsula todo o comportamento e marcação repetitiva:
  - Acordeão expansível (`mat-accordion` / `mat-expansion-panel`) com two-way binding `[(filtersExpanded)]`.
  - Cabeçalho padronizado com ícone configurável (`[icon]`), título internacionalizado (`[title]` / `[titleKey]`) e distintivo dinâmico de filtros ativos (`activeFiltersCount`).
  - Botão de expansão/recolhimento com tooltip dinâmico e animação suave.
  - Grade responsiva padronizada (`.filters-grid` / `.filter-item`) adaptável para 1 a 4 colunas (`[columns]`).
  - Barra de ações padronizada com suporte a Buscar (`(searchClick)`), Limpar (`(resetClick)`), Exportar (`(exportClick)`), flags de exibição (`[showSearch]`, `[showReset]`, `[showExport]`) e desabilitação contextual (`[searchDisabled]`, `[resetDisabled]`, `[exportDisabled]`, `[loading]`).
  - Slots de projeção de conteúdo para ações adicionais (`[filter-actions-start]`, `[filter-actions-extra]`).

- **Exemplo de Template do Filtro de Feature (`{feature}-list-filter.component.html`)**:
  ```html
  <app-list-filter
    [title]="'minhaFeature.filters.title' | translate"
    [(filtersExpanded)]="filtersExpanded"
    [activeFiltersCount]="activeFiltersCount"
    [loading]="loading"
    [showExport]="false"
    (searchClick)="onSearch()"
    (resetClick)="onReset()"
    (filtersExpandedChange)="filtersExpandedChange.emit($event)"
  >
    @if (filterForm) {
      <form [formGroup]="filterForm" class="filters-grid">
        <div class="filter-item">
          <mat-form-field appearance="outline" floatLabel="always" class="w-100" subscriptSizing="dynamic">
            <mat-label>{{ 'minhaFeature.statusLabel' | translate }}</mat-label>
            <mat-select formControlName="status">
              <mat-option value="">{{ 'common.statusAll' | translate }}</mat-option>
              <mat-option [value]="true">{{ 'common.statusActive' | translate }}</mat-option>
              <mat-option [value]="false">{{ 'common.statusInactive' | translate }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="filter-item search-term-item">
          <mat-form-field appearance="outline" class="w-100" subscriptSizing="dynamic">
            <mat-label>{{ 'common.searchLabel' | translate }}</mat-label>
            <input matInput formControlName="search" (keyup.enter)="onSearch()" />
          </mat-form-field>
        </div>
      </form>
    }
  </app-list-filter>
  ```

#### 3. Reuso Obrigatório do Grid de Dados (`DataGridComponent` / `TanstackTableComponent`)
Da mesma forma que os filtros são abstraídos em `<app-list-filter>`, a tabela de dados deve utilizar os componentes compartilhados oficiais:
- `<app-data-grid>` (`src/app/shared/components/data-grid/`): Encapsula paginação, cabeçalhos de ordenação, estado vazio (*empty states*), skeletons/spinners de carregamento e ações em lote.
- `<app-tanstack-table>` (`src/app/shared/components/tanstack-table/`): Solução de alta performance para listagens complexas com TanStack Table v8.

#### 4. Diretrizes de Clean Code e Qualidade
1. **DRY (Don't Repeat Yourself)**: Nenhum componente de filtro de feature deve redeclarar acordeões, botões de busca/limpeza ou estruturas CSS de grade do zero.
2. **Single Responsibility (SRP)**: O filtro gerencia valores e formulários; o `ListFilterComponent` gerencia layout e eventos do painel; a lista principal gerencia chamadas de dados.
3. **Design Tokens & Acessibilidade**: Toda interação visual deve herdar tokens de cores e variáveis CSS do tema (`--color-surface`, `--color-primary`, `--color-border`), garantindo compatibilidade total com modo claro e escuro.

---

## 5. Testes

### 5.1 Convencoes Gerais

- Nomes de metodos em ingles, padrao `Method_Scenario_ExpectedResult`.
- Comentario em portugues acima de cada metodo: `// Cenário:` e `// Objetivo:`.
- Corpo no padrao AAA com marcadores `// Arrange`, `// Act` e `// Assert`.
- Ferramentas: NUnit, Moq, Bogus, AwesomeAssertions (fork Apache 2.0 do FluentAssertions).
- Lib de asserts centralizada em [`backend/build/TestAssertions.props`](../backend/build/TestAssertions.props) (`TestAssertionPackageId` / `TestAssertionLibraryNamespace`); projetos `*.Tests` nao precisam de `using AwesomeAssertions`.
- Cobrir fluxo principal, alternativos, limites e erros/excecoes.
- Usar `Assert.EnterMultipleScope()` para multiplas validacoes no mesmo teste.

### 2.5 Convenções de Testes Modernos (NUnit 4 e xUnit v3)
- **Escopos Múltiplos NUnit 4:** Utilizar exclusivamente `using var scope = Assert.EnterMultipleScope();` em vez de `Assert.Multiple(() => { ... })` ou `Assert.MultipleAsync`.
- **Agrupamento de Asserções Independentes:** Quando um teste contiver duas ou mais asserções independentes consecutivas (ex.: verificar `Success` e `StatusCode`), envolvê-las obrigatoriamente dentro de um escopo `using var scope = Assert.EnterMultipleScope();`.
- **Cancelamento Assíncrono no xUnit v3:** Em `SmartCoreHub.Core.SDK.Tests` (xUnit v3), passar obrigatoriamente `TestContext.Current.CancellationToken` em métodos assíncronos para evitar a issue `xUnit1051`.
- **Asserções de Tipo no AwesomeAssertions:** Utilizar sempre a forma genérica `.Should().Be<TExpected>()` em vez de `.Should().Be(typeof(TExpected))`.


---

### 5.2 Backend

Cobertura minima esperada para mudancas relevantes:

- Testes de entidade e regras simples de dominio
- Testes de validator para cenarios validos e invalidos (meta: 100% de linhas e ramos)
- Testes de configuracao EF para indices, FKs e check constraints
- Testes de repositorio para includes e consultas especificas
- Testes de service para regras de negocio, localizacao de erro e contratos
- Testes de controller / dispatcher para contratos `ServiceResponse<T>` e fluxos CQRS
- Testes de migracao quando houver rollout em duas fases ou backfill
- Contract tests do adapter MediatR / isolamento (`IMediator` ausente em controllers e handlers de produto)
- Testes de contrato do AppHost unificado (`ProgramTests`, `AspirePipelineIsolationTests`)

#### Casos criticos para Tenant, Application e User

- `TenantValidator` e DTO validators
- Validacao XOR de `User`
- `TenantConfigurationTests`, `ApplicationConfigurationTests`, `UserConfigurationTests`
- `TenantRepositoryTests`, `ApplicationRepositoryTests`, `UserRepositoryTests`
- `TenantServiceTests`, `ApplicationServiceTests`, `UserServiceTests`

#### Comandos

```powershell
dotnet restore backend/SmartCoreHub.sln
dotnet build backend/SmartCoreHub.sln -c Release --no-restore
dotnet test backend/SmartCoreHub.sln -c Release --no-build
```

Cobertura:

```sh
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=opencover
```

---

### 5.3 Frontend

- Criar specs para formularios e listas de Tenant.
- Ajustar specs de Application para `TenantId` obrigatorio.
- Ajustar specs de User para alternancia de escopo e limpeza cruzada de campos.
- Testar services derivados de `BaseApiService` para garantir que usam os endpoints esperados.
- Validar comportamento de loading local e loading global opt-in.

```sh
cd frontend
npm test -- --watchAll=false --ci
```

O script `test` executa Jest. Em 23/10/2026 a solucao backend passou 6.808 testes e o painel passou 3.119 testes em 230 suites. Esses totais mudam a cada suite; nao os trate como meta fixa.

---

### 5.4 Validacao Final de Entrega

Antes de considerar uma feature pronta, confirmar:

1. Build do backend sem erro: `dotnet build backend/SmartCoreHub.sln`.
2. Testes unitarios e de integracao relevantes passando.
3. Testes frontend relevantes passando (se a mudanca tocar UI).
4. API iniciando sem erro de injecao de dependencia (standalone).
5. Quando tocar orquestracao: AppHost unificado sobe as duas APIs.
6. Migrations aplicando em ambiente limpo (somente se houve mudanca aprovada de schema).
7. Seeds consistentes com FKs, constraints e novos contratos.
8. Swagger/Scalar e endpoints respondendo no contrato esperado.
9. Logs sem exposicao de segredos.
10. Headers de seguranca e correlacao presentes nas respostas.
11. Docker/Compose legado intacto (sem regressao de portas/entrypoints), salvo mudanca deliberada documentada.
12. Deploy App Service por API nao foi acoplado ao AppHost Aspire.

---

## 6. Padroes Obrigatorios

| Camada | Padrao |
| ------ | ------ |
| Entidades | Herdar de `BaseEntity`. Nao duplicar campos base. Mudanca estrutural exige R-GOV-ENTITY. |
| Repositorios | Herdar de `GenericRepository<TEntity>`. Adicionar apenas consultas especificas. |
| Services | Herdar de `GenericService<TEntity>` quando CRUD generico. Localization: services modulares + handlers CQRS. |
| CQRS | Controllers usam `IApplicationDispatcher`. Nunca `IMediator`/`IRequest` no codigo de produto. |
| Controllers | Receber DTOs e retornar `ServiceResponse<T>` (salvo excecao Localization.API). Usar `BaseApiController`. |
| Excecoes de negocio | `BusinessException` → HTTP 422. |
| DTOs | Refletir o dominio sem expor entidades EF nos endpoints administrativos. |
| Mapeamento | Centralizado em `AutoMapperProfile` via `ISmartCoreHubMapper`. |
| Validacao | FluentValidation com `.WithMessage` em inglês, `ErrorCode` sintético e `.WithMessageKey`. O método que recebe criteria, request ou DTO valida esse contrato primeiro (`ValidateAsync`) e só depois segue o processo. Ex.: `_getResourceValidator.ValidateAsync(getResourceRequest, cancellationToken)` antes de desviar por `ContentSource`. |
| Logging | Usar `IAppLogger`. Nunca logar secrets ou tokens completos. |
| Adaptadores | Classe e arquivo terminam com `Adapter`. A interface do contrato também. Ex.: `ElasticSearchJsonDocumentAdapter`, `IJsonDocumentAdapter`. Não nomear esse papel como `Store`, `Client` nem com a grafia `Adpter`. |
| Mensagens | Várias chaves ou textos de mensagem no mesmo método entram em um único DTO. Não passar cada `messageKey` ou texto como parâmetro solto. Ex.: `VersionSnapshotMessagesDto`. |
| EF Core | Configuracoes em classes `IEntityTypeConfiguration<TEntity>`. |
| Genericos | Preferir Core.SDK; nao duplicar helpers no Service. |
| Seeds | Centralizados e coerentes com migrations e constraints. |
| Aspire | Um AppHost unificado; deploy Aspire opt-in; App Service permanece oficial. |
| Frontend Services | Herdar de `BaseApiService<T, TCreate, TUpdate>`. |
| Frontend Templates | **Proibido template inline (`template: ...`)**. Todo componente novo deve obrigatoriamente ter arquivos separados de template (`templateUrl`) e estilo (`styleUrls`). |
| Loading | Loading global somente opt-in com `ENABLE_GLOBAL_LOADING`. |
| AppSettings | Toda chave nao sensivel tem valor padrao no `appsettings.json` e na classe tipada. Segredo real fica vazio; placeholder so quando a subida exige formato minimo. |
| Segredos | Nunca versionar segredo real. Usar variaveis de ambiente / User Secrets / App Settings, que sobrescrevem o padrao. |
| Migrations | Rollout incremental. Expand/backfill antes de enforce. Aprovacao previa. |
| Controle de Versao (Git) | **Proibido commit, push, PR ou branch automatico/autonomo (R-GOV-GIT)**. Mudancas permanecem estritamente locais no working tree. |

---

## 7. Checklist Rapido

- [ ] Consultei `PROJECT_GUIDELINES.md` e a spec da feature (se existir).
- [ ] Mudanca de entidade/migration foi **aprovada** pelo usuario (R-GOV-ENTITY), se aplicavel.
- [ ] A entidade herda de `BaseEntity` e nao duplica campos base.
- [ ] O repositorio herda de `GenericRepository<TEntity>` e adiciona apenas consultas especificas.
- [ ] O service segue GenericService ou service modular + handler CQRS.
- [ ] Controllers complexos usam `IApplicationDispatcher` (sem `IMediator`).
- [ ] O controller recebe DTOs e retorna `ServiceResponse<T>` (ou excecao Localization documentada).
- [ ] O mapeamento foi registrado em `AutoMapperProfile` via `ISmartCoreHubMapper`.
- [ ] A validacao usa FluentValidation com `.WithMessage` em inglês, `ErrorCode` sintético e `.WithMessageKey` no RESX neutro e nos satélites.
- [ ] O método valida o criteria, request ou DTO no início, antes de consulta, publicação, cache ou provedor.
- [ ] A configuracao EF possui tabela, campos, indices, relacionamentos e constraints nomeados.
- [ ] Seeds e migrations estao consistentes com a mudanca e com dados existentes.
- [ ] Genericos novos foram para o Core.SDK (se reutilizaveis).
- [ ] AppHost/Aspire nao recebe secrets JWT duplicados; Compose nao grava secrets reais.
- [ ] O frontend reutiliza `BaseApiService`, usa i18n e espelha regras criticas do backend.
- [ ] **Serialização de Enums no Frontend (R-FE-ENUM-NUMERIC)**: Todo campo de enum do backend é enviado pelo frontend como valor inteiro numérico (`0, 1, 2...`) no payload JSON, nunca como string/texto.
- [ ] Novos componentes no Frontend utilizam arquivos de template `.html` e `.scss` separados (`templateUrl` / `styleUrls`), sem templates inline (`template: ...`).
- [ ] Testes cobrem regras de negocio, DTOs, validadores, configuracoes e fluxos principais.
- [ ] Toda chave de `appsettings` nao sensivel tem valor padrao no JSON e na classe. Segredo real nao foi versionado; placeholder de subida esta documentado para substituicao.
- [ ] A API sobe sem erros de injecao de dependencia.
- [ ] Swagger/Scalar e endpoints respondem no contrato esperado.
- [ ] Logs nao expoe dados sensiveis.
- [ ] Todo adaptador termina com `Adapter` no nome da classe e do arquivo. A interface do contrato segue o mesmo sufixo.
- [ ] Chaves e textos de mensagem do mesmo método estão em um único DTO, sem um parâmetro solto por mensagem.
- [ ] Matriz `/health` / `/ready` preservada por API.
- [ ] Nenhuma operacao de `commit`, `push`, criacao de `branch` ou abertura de `PR` foi executada de forma autonoma (R-GOV-GIT).

---

## 8. Fontes Consolidadas

| Documento | Contribuicao principal |
| --------- | ---------------------- |
| [`README.md`](../README.md) | Visao geral, stack, URLs, build/test |
| [`Documentation/README.md`](README.md) | Indice da documentacao |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Arquitetura em camadas |
| [`Outros/DEVELOPER-GUIDE.md`](Outros/DEVELOPER-GUIDE.md) | Onboarding e execucao local |
| [`CQRS/CQRS.md`](CQRS/CQRS.md) | Fluxo CQRS / `IApplicationDispatcher` |
| [`CQRS/CQRS-Como-Implementar-Dicas.md`](CQRS/CQRS-Como-Implementar-Dicas.md) | Como implementar query + command update (padrão Localization) |
| [`Outros/api-README.md`](Outros/api-README.md) | Contrato e boas praticas da API REST |
| [`Outros/API-Infrastructure.md`](Outros/API-Infrastructure.md) | Middlewares: telemetria, compressao, rate limiting, seguranca, correlacao |
| [`Outros/DOCKER-AND-COMPOSE-GUIDE.md`](Outros/DOCKER-AND-COMPOSE-GUIDE.md) | Dockerfiles e Compose ativos vs legado |
| [`General/Outros/EF-MIGRATIONS-HOWTO.md`](General/Outros/EF-MIGRATIONS-HOWTO.md) | Migrations multi-provider, aplicar e trocar runtime para PostgreSQL |
| [`Outros/frontend-README.md`](Outros/frontend-README.md) | Estrutura e convencoes do frontend Angular |
| [`Outros/FEATURES-AND-RELEASES.md`](Outros/FEATURES-AND-RELEASES.md) | Catalogo de recursos e releases |
| [`Features/SmartCoreHub-Aspire-CQRS-MediatR/SmartCoreHub-Aspire-CQRS-MediatR-Requisitos.md`](Features/SmartCoreHub-Aspire-CQRS-MediatR/SmartCoreHub-Aspire-CQRS-MediatR-Requisitos.md) | Requisitos Aspire + CQRS (normativo) |
| [`Features/SmartCoreHub-Aspire-CQRS-MediatR/SmartCoreHub-Aspire-CQRS-MediatR-PlanoImplementacao.md`](Features/SmartCoreHub-Aspire-CQRS-MediatR/SmartCoreHub-Aspire-CQRS-MediatR-PlanoImplementacao.md) | Plano operacional Aspire + CQRS |
| [`infra/aspire/smartcorehub-api/README.md`](../infra/aspire/smartcorehub-api/README.md) | AppHost unificado (opt-in) |
| [`ASPIRE/MULTIPLE-APIS.md`](ASPIRE/MULTIPLE-APIS.md) | Como adicionar APIs ao AppHost |
| [`backend/Core/SmartCoreHub.Core.SDK/README.md`](../backend/Core/SmartCoreHub.Core.SDK/README.md) | Catalogo Core.SDK |
| [`Features/FEITOS/locatario-tenant-spec.md`](Features/FEITOS/locatario-tenant-spec.md) | Feature Tenant/Locatario |
| [`Features/FEITOS/application-configuration-feature-spec.md`](Features/FEITOS/application-configuration-feature-spec.md) | Feature ApplicationConfiguration |
| [`Features/FEITOS/tenant-application-configuration-planos-unificado-spec.md`](Features/FEITOS/tenant-application-configuration-planos-unificado-spec.md) | Feature Planos e Assinatura |
| [`Features/FEATURE-ENV-SECRETS-MIGRATION-SPEC.md`](Features/FEATURE-ENV-SECRETS-MIGRATION-SPEC.md) | Migracao de segredos para variaveis de ambiente |
| [`Features/FEITOS/ValidationFLuent.md`](Features/FEITOS/ValidationFLuent.md) | Padrao FluentValidation |
| [`Features/FEITOS/loading-http-optin-README.md`](Features/FEITOS/loading-http-optin-README.md) | Loading global HTTP opt-in |
| [`Features/FEITOS/logging-decoupling.md`](Features/FEITOS/logging-decoupling.md) | Desacoplamento de logging via IAppLogger |
| [`Features/FEITOS/ApiKey.md`](Features/FEITOS/ApiKey.md) | API Key Authentication |
| [`Features/FEITOS/DapperAdpterGenericRepository.md`](Features/FEITOS/DapperAdpterGenericRepository.md) | Repositorio Dapper generico |
| [`Features/FEITOS/cache-architecture-package-guide.md`](Features/FEITOS/cache-architecture-package-guide.md) | Arquitetura de cache plugavel |
| [`Features/FEITOS/Localization-Locale-Header-Spec.md`](Features/FEITOS/Localization-Locale-Header-Spec.md) | Locale via header |
| [`Features/FEITOS/Localization-Import-I18n-Formats-Spec.md`](Features/FEITOS/Localization-Import-I18n-Formats-Spec.md) | Import i18n |
| [`Features/FEITOS/Localization-Export-I18n-Formats-Spec.md`](Features/FEITOS/Localization-Export-I18n-Formats-Spec.md) | Export i18n (paridade) |
| [`Features/FEITOS/clone-language-feature.md`](Features/FEITOS/clone-language-feature.md) | Clone de idioma |
| [`Features/FEITOS/API-DOCUMENTATION-UI.md`](Features/FEITOS/API-DOCUMENTATION-UI.md) | UIs OpenAPI |
| [`Features/FEITOS/WEBAPPLICATION-DI-REFACTOR-SURVEY.md`](Features/FEITOS/WEBAPPLICATION-DI-REFACTOR-SURVEY.md) | Refatoracao DI/pipeline |
| [`Features/MCP/`](Features/MCP/) | Integracao MCP |
| [`Backend/COVERAGE AND TEST/Diretrizes-Coverage-Backend-Generico.md`](Backend/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Backend-Generico.md) | Cobertura de Testes Backend (Guia Genérico) |
| [`Backend/COVERAGE AND TEST/Diretrizes-Coverage-Backend-SmartCoreHub.md`](Backend/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Backend-SmartCoreHub.md) | Cobertura e Testes Backend (SmartCoreHub - 4.459 testes) |
| [`Backend/COVERAGE AND TEST/Diretrizes-CodeSmell-Backend-Generico.md`](Backend/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-Backend-Generico.md) | Ajuste de Code Smells Backend (Guia Genérico) |
| [`Backend/COVERAGE AND TEST/Diretrizes-CodeSmell-Backend-SmartCoreHub.md`](Backend/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-Backend-SmartCoreHub.md) | Ajuste de Code Smells Backend (SmartCoreHub) |
| [`FrontEnd/COVERAGE AND TEST/Diretrizes-Coverage-Frontend-Generico.md`](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Frontend-Generico.md) | Cobertura de Testes Frontend (Guia Genérico) |
| [`FrontEnd/COVERAGE AND TEST/Diretrizes-Coverage-Frontend-SmartCoreHub.md`](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Frontend-SmartCoreHub.md) | Cobertura e Testes Frontend (SmartCoreHub - 1.751 testes) |
| [`FrontEnd/COVERAGE AND TEST/Diretrizes-CodeSmell-Frontend-Generico.md`](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-Frontend-Generico.md) | Ajuste de Code Smells Frontend (Guia Genérico) |
| [`FrontEnd/COVERAGE AND TEST/Diretrizes-CodeSmell-SmartCoreHubUI.md`](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-SmartCoreHubUI.md) | Ajuste de Code Smells Frontend (SmartCoreHub UI) |
| [`FrontEnd/COVERAGE AND TEST/Diretrizes-CodeSmell-LocalizationSdkTypeScript.md`](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-LocalizationSdkTypeScript.md) | Ajuste de Code Smells Frontend (Localization SDK) |
| [`FrontEnd/COVERAGE AND TEST/Diretrizes-CodeSmell-LandingPage-React.md`](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-LandingPage-React.md) | Ajuste de Code Smells Frontend (Landing Page React) |
| [`FrontEnd/COVERAGE AND TEST/Diretrizes-CodeSmell-FrontendSdkExample-Angular.md`](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-FrontendSdkExample-Angular.md) | Ajuste de Code Smells Frontend (Exemplo Angular) |
| [`Backend/UpdatePackages/GuiaGenericoAtualizacaoPacotes.md`](Backend/UpdatePackages/GuiaGenericoAtualizacaoPacotes.md) | Atualizacao de pacotes Backend (Guia Genérico) |
| [`Backend/UpdatePackages/GuiaAtualizacaoPacotes-SmartCoreHub.md`](Backend/UpdatePackages/GuiaAtualizacaoPacotes-SmartCoreHub.md) | Atualizacao de pacotes Backend (SmartCoreHub) |
| [`FrontEnd/UpdatePackages/GuiaGenericoAtualizacaoPacotesFrontend.md`](FrontEnd/UpdatePackages/GuiaGenericoAtualizacaoPacotesFrontend.md) | Atualizacao de pacotes Frontend (Guia Genérico) |
| [`FrontEnd/UpdatePackages/GuiaAtualizacaoPacotes-SmartCoreHubUI.md`](FrontEnd/UpdatePackages/GuiaAtualizacaoPacotes-SmartCoreHubUI.md) | Atualizacao de pacotes Frontend (SmartCoreHub UI) |
