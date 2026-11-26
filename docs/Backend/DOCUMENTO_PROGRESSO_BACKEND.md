# Documento de Progresso e Checklist de Implantação do Backend

**Projeto:** KinkConsentManager  
**Documento:** Orquestração em Ondas, Checklist Granular, Rastreabilidade e Controle de Riscos  
**Arquitetura:** Espelho `C:\git\SmartCoreHub\backend` + NuGet [`SmartCoreHub.Core.SDK`](https://www.nuget.org/packages/SmartCoreHub.Core.SDK) + Supabase EF Core (`kink_consent`)  
**Versão:** 2.0 (Revisão Alinhada ao `SmartCoreHub.Core.SDK`)  
**Data:** 26 de Novembro de 2026  

---

## 1. Estratégia de Execução em Fases e Ondas

O ciclo completo de entrega do Backend e Sincronização em Nuvem foi dividido em **3 Fases**, sendo que a **Fase 1 (API de Autenticação e Cadastro)** é o escopo imediato e é executada em **4 Ondas (Gates)** de dependência para permitir validação rápida, testes contínuos e zero retrabalho:

```mermaid
flowchart TB
    subgraph F1["Fase 1 (Escopo Imediato): API de Login e Cadastro"]
        W0["Onda 0 (Fundação):\nSln, CPM, SmartCoreHub.Core.SDK"]
        W1["Onda 1 (Domínio & Infra):\nEntidades LongEntityBase, Validators,\nDbContext kink_consent & Migration"]
        W2["Onda 2 (Serviço & Segurança):\nJwtTokenService HS512,\nAuthService, CQRS & DI"]
        W3["Onda 3 (API & QA):\nAuthController, Swagger/Health,\nNUnit + Testcontainers"]
        W0 --> W1 --> W2 --> W3
    end

    F2["Fase 2 (Próxima):\nPersistência do Report (jsonb)\n& ReportsController"]
    F3["Fase 3:\nIntegração Frontend Angular 22\n(Modais Auth + Toggle Cloud Autosave)"]

    F1 --> F2 --> F3
```

### 1.1 Painel Executivo de Progresso

| Fase / Onda | Escopo Principal | Tarefas | Concluídas | Cobertura / Evidência Observada | Status Geral |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Fase 1 — Onda 0** | Fundação, Estrutura 4 Projetos, CPM & `Core.SDK` | 2 | 2 | Build Release: `0` warnings / `0` erros | 🟢 Concluído |
| **Fase 1 — Onda 1** | Domínio (`UserKink`, `UserKinkRefreshToken`, `UserKinkCheclist`), FluentValidation & Supabase EF (`kink_consent`) | 4 | 3 | `InitialCreateAuth` gerada (`dotnet ef database update` pendente de `user-secrets`) | 🟡 3/4 Concluídas (`B1.6` em progresso) |
| **Fase 1 — Onda 2** | `ValidationMessageService`, `JwtTokenService` (`HS512`), `AuthService`, CQRS & DI | 5 | 5 | `KinkConsentManager.Core.Tests`: `112/112` aprovados (`LineRate=39,00%` global incl. migrations/adapters) | 🟢 Concluído |
| **Fase 1 — Onda 3** | `AuthController`, `Program.cs`, OpenAPI/Health & Suíte Integrada | 3 | 3 | `KinkConsentManager.API.Tests`: `19/19` aprovados (`LineRate=35,67%` incl. Core) | 🟢 Concluído |
| **Subtotal Fase 1** | **API de Login e Cadastro (Escopo Imediato)** | **14** | **13** | **`131/131` testes aprovados (`0` falhas)** | 🟡 **Implementado (`B1.6` aguardando `user-secrets` Supabase)** |
| **Fase 2** | Entidade `UserKinkCheclist` (`jsonb`), `ReportsController` & Testes | 7 | 0 | ≥ 85% (Entidade/Config/Migration já preparadas na Fase 1) | ⚪ Aguardando Fase 1 |
| **Fase 3** | Frontend Angular 22 (Auth Modal, Interceptor, Cloud Autosave Toggle) | 8 | 0 | ≥ 85% Jest | ⚪ Aguardando Fase 2 |
| **TOTAL GERAL** | **Backend V2 Completo + Cloud Sync** | **29** | **13** | **`131/131` (Fase 1)** | **Fase 1 Implementada** |

*Legenda de Status:* `[ ] Pendente` · `[/] Em Progresso` · `[x] Concluído` · `[!] Bloqueado`

---

## 2. Checklist Detalhado — Fase 1: API de Login e Cadastro (Escopo Imediato)

### Onda 0: Fundação, Estrutura 4 Projetos e `SmartCoreHub.Core.SDK`

- [x] **B1.1 — Criar Estrutura `backend/` em 4 Projetos Espelhando `SmartCoreHub\backend`**
  - **Camada:** Solution / Governance
  - **Artefatos:** `backend/global.json` (`10.0.300`), `backend/Directory.Build.props`, `backend/build/TestAssertions.props`, `backend/KinkConsentManager.sln`, pastas `APIs/` (`KinkConsentManager.API` + `*.Tests`) e `Core/` (`KinkConsentManager.Core` com pastas `Domain/`, `Infrastructure/`, `Service/` + `KinkConsentManager.Core.Tests`).
  - **Reaproveitamento SDK:** Nenhum (prepara o workspace com `Core/KinkConsentManager.Core`, sem duplicar o `SmartCoreHub.Core.SDK`).
  - **Verificação:** `dotnet build KinkConsentManager.sln -c Release` compila os 4 projetos com `0` warnings e `0` erros (`TreatWarningsAsErrors = true`).
  - **DoD:** Todos os 4 projetos (2 código + 2 testes NUnit) criados e referenciados corretamente na solution.

- [x] **B1.2 — Configurar `Directory.Packages.props` (CPM) e Instalar `SmartCoreHub.Core.SDK`**
  - **Camada:** Governance / NuGet
  - **Artefatos:** `backend/Directory.Packages.props`.
  - **Reaproveitamento SDK:** Instalação de `SmartCoreHub.Core.SDK` (`20261120.2351.0`), pinando EF Core `9.0.23` e `Npgsql.EntityFrameworkCore.PostgreSQL` `9.0.4` para compatibilidade total com o SDK.
  - **Verificação:** `dotnet restore` e `dotnet build KinkConsentManager.sln -c Release --no-restore` sem erros ou warnings `NU1605`/`NU1107`.
  - **DoD:** Zero versões hardcoded dentro dos `.csproj`; restauração limpa do `SmartCoreHub.Core.SDK`, `Serilog` e `AwesomeAssertions`.

---

### Onda 1: Domínio, Validadores e Infraestrutura Supabase (`kink_consent`)

- [x] **B1.3 — Modelar Entidades e DTOs de Autenticação (`Core/Domain`)**
  - **Camada:** Domain (`Core/KinkConsentManager.Core/Domain/`)
  - **Artefatos:** `Entities/UserKink.cs` (incluindo `NormalizedLogin` + `SetLogin`), `Entities/UserKinkRefreshToken.cs`, `Entities/UserKinkCheclist.cs`, `DTOs/Authentication/` (`RegisterUserKinkRequestDto`, `UserKinkDto`, `LoginResponseDto`, `LogoutRequestDto`), `Localization/MessageKeys/AuthenticationMessageKeys.cs`, `Interfaces/Repositories/` (`IUserKinkRepository` com `GetByLoginOrEmailAsync`, `IUserKinkRefreshTokenRepository`), `Interfaces/Services/IAuthenticationService.cs`.
  - **Reaproveitamento SDK:** Herdar `LongEntityBase`; usar Value Object `Email`; reutilizar `LoginDto`, `RefreshTokenDto`, `PasswordVerificationInput` e `ServiceResponse<T>` diretamente do SDK.
  - **Verificação:** `dotnet build KinkConsentManager.sln -c Release` com `0` warnings/erros.
  - **DoD:** Zero classes duplicadas do SDK; XML-docs em português em todos os tipos e membros públicos.

- [x] **B1.4 — Implementar Contratos de i18n no Domínio e Validadores Desacoplados**
  - **Camada:** Domain + Core.Tests (`Core/KinkConsentManager.Core.Tests/Domain/Validators/`)
  - **Artefatos:** `Interfaces/Localization/IValidationMessageService.cs` (+ `NullValidationMessageService`), `Localization/MessageKeys/ValidationMessageKeys.cs`, `Validators/Extensions/FluentValidationLocalizationExtensions.cs` (`WithMessageKey`), `Validators/Authentication/` (`PasswordValidator`, `RegisterUserKinkRequestValidator`, `LoginDtoValidator`, `RefreshTokenDtoValidator`, `PasswordVerificationInputValidator`), `Core/KinkConsentManager.Core.Tests/Domain/Validators/...`.
  - **Reaproveitamento SDK:** Reutiliza chaves nativas `SmartCoreHub.Core.SDK.Validation.*`, compatibilidade com `FluentValidationBehavior` via `IHasValidationPayload<T>` e `FunctionalMessageTextResolver.TryReadMessageKey`.
  - **Verificação:** `dotnet test KinkConsentManager.sln -c Release` (`112/112` em `Core.Tests`).
  - **DoD:** **Todos** os validadores injetam `IValidationMessageService`, usam avaliação dinâmica por requisição (`.WithMessage(_ => ...)`), `WithErrorCode` e `WithMessageKey`, sem dependência de `.resx` no Domain; testes NUnit + AwesomeAssertions + Bogus cobrindo 100% das regras.

- [x] **B1.5 — Configurar `DbContext`, `DbScope`, `.resx` de Localização, Mapeamentos e Repositórios**
  - **Camada:** Infrastructure + Core.Tests (`Core/KinkConsentManager.Core/Infrastructure/` e `Core.Tests/Infrastructure/`)
  - **Artefatos:** `Data/KinkConsentManagerDbContext.cs`, `Data/KinkConsentManagerDbContextPostgreSql.cs`, `Data/KinkConsentManagerDbContextScope.cs`, `Data/KinkConsentManagerDbContextPostgreSqlFactory.cs`, `Data/Configurations/UserKinkConfiguration.cs`, `Data/Configurations/UserKinkRefreshTokenConfiguration.cs`, `Data/Configurations/UserKinkCheclistConfiguration.cs`, `Localization/Resources/ValidationMessages.resx`, `Localization/Resources/ValidationMessages.pt-BR.resx`, `Localization/Resources/AuthMessages*.resx`, `Repositories/KinkConsentManagerGenericRepository.cs`, `Repositories/UserKinkRepository.cs`, `Repositories/UserKinkRefreshTokenRepository.cs`.
  - **Reaproveitamento SDK:** `EfDbContextScope<T>`, `GenericRepository<T, TCtx>`, `EfMigrationsHistoryHelper.PostgreSqlTable`, `DesignTimeDatabaseBootstrap`, `Email` VO conversion.
  - **Verificação:** `Core.Tests/Infrastructure/` passando (`DbContextModelMappingTests`, `LocalizationResourcesParityTests`, `UserKinkRepositoryTests`, `UserKinkRefreshTokenRepositoryTests` com EF Core InMemory).
  - **DoD:** Nenhuma tabela ou histórico de migration mapeado em `public`; índices únicos em `UserKinks(Email)`, `UserKinks(NormalizedLogin)`, `UserKinks(Login)`, `UserKinkRefreshTokens(TokenHash)` e `UserKinkCheclists(UserKinkId)` (`jsonb` + índice GIN); 100% das chaves de `ValidationMessageKeys` presentes nos `.resx`.

- [/] **B1.6 — Gerar e Aplicar Migration Inicial `InitialCreateAuth` no Supabase**
  - **Camada:** Infrastructure / Supabase DB
  - **Artefatos:** `Core/KinkConsentManager.Core/Infrastructure/Migrations/PostgreSql/20261126193756_InitialCreateAuth.cs`.
  - **Reaproveitamento SDK:** `EfMigrationsHistoryHelper.PostgreSqlTable` no schema `kink_consent`.
  - **Verificação:** `dotnet ef migrations add InitialCreateAuth` concluído e compilado em Release; falta executar `dotnet ef database update` usando **Direct Connection (porta `5432`)** quando a string de conexão real do Supabase estiver configurada em `dotnet user-secrets`.
  - **DoD:** Tabelas `kink_consent."UserKinks"`, `kink_consent."UserKinkRefreshTokens"`, `kink_consent."UserKinkCheclists"` e `kink_consent."__EFMigrationsHistory_PostgreSql"` criadas no Supabase sem tocar nos schemas `auth`, `storage` ou `public`.

---

### Onda 2: Localização Centralizada, Segurança JWT (`HS512`), Serviços e Composição DI

- [x] **B1.7 — Implementar Classe Service Centralizada `ValidationMessageService`**
  - **Camada:** Service (`Core/KinkConsentManager.Core/Service/`)
  - **Artefatos:** `Localization/ValidationMessageService.cs` (implementando `IValidationMessageService` e `IErrorGetLocalizationService`).
  - **Reaproveitamento SDK:** `IFunctionalMessageProvider`, `AddSmartCoreHubFunctionalMessages`, `FunctionalMessageResultFilter`, `LocalizationHeaderCultureMiddleware`.
  - **Verificação:** `ValidationMessageServiceTests.cs` aprovado em `en-US` e `pt-BR` (chaves `SmartCoreHub.Core.SDK.*` e chaves do produto + fallback seguro).
  - **DoD:** Ponto único centralizado de idiomas/resources para todos os validadores e pipeline de erros da API.

- [x] **B1.8 — Implementar `JwtTokenService` e `AuthenticationExtensions` (JWT `HS512`)**
  - **Camada:** Service (`Core/KinkConsentManager.Core/Service/`)
  - **Artefatos:** `Security/JwtTokenService.cs`, `API/DI/AuthenticationExtensions.cs`.
  - **Reaproveitamento SDK:** `IJwtAccessTokenService`, `JwtAccessTokenService.BuildStandardAccessClaims`, `ISecurityTokenAdapterFactory`, `TokenConfigurationServiceCollectionExtensions` (`AddTokenConfiguration`, `EnsureSigningSecret`, `CreateTokenValidationParameters`, `AddAuthenticatedUserPolicy`).
  - **Verificação:** `JwtTokenServiceTests.cs` validando emissão e validação do JWT `HS512` (incluindo fallback `UserClaimsHelper.TryGetUserId`) e rejeição de `TokenConfigurations:Secret` menor que 64 bytes.
  - **DoD:** Nenhuma chave secreta hardcoded no código; validação automática de tamanho mínimo de 512 bits no startup.

- [x] **B1.9 — Implementar `AuthenticationService` (BCrypt + Login/Email Dual + Rotation + Reuse Detection)**
  - **Camada:** Service (`Core/KinkConsentManager.Core/Service/`)
  - **Artefatos:** `Services/AuthenticationService.cs`, `Mappings/AutoMapperProfile.cs`.
  - **Reaproveitamento SDK:** `PasswordHasherFactory.GetHasher(PasswordAlgorithm.Bcrypt)`, `FluentValidationErrorMappingHelper`, `ISmartCoreHubMapper`, `IAppLogger`, `ServiceResponse<T>`, `ITransactionExecutor`.
  - **Verificação:** `AuthenticationServiceTests.cs` aprovado cobrindo cadastro, duplicidade `409`, autenticação por `Login` (*case-insensitive*), autenticação por `Email` (*case-insensitive*), entrada malformada com `@` retornando `401`, refresh rotation e reuse detection.
  - **DoD:** Zero vazamento de hashes ou senhas em logs/DTOs.

- [x] **B1.10 — Implementar Comandos/Handlers CQRS e Composição DI do Host**
  - **Camada:** Service (`Core/KinkConsentManager.Core/Service/`)
  - **Artefatos:** `Cqrs/Authentication/Commands/` (`RegisterUserKinkCommand`, `LoginCommand`, `RefreshTokenCommand`, `LogoutCommand`), `Cqrs/Authentication/Queries/GetCurrentUserKinkQuery.cs`, `API/DI/WebApplicationBuilderServicesConfigure.cs`, `API/DI/WebApplicationExtensions.cs`, `API/DI/DatabaseExtensions.cs`, `API/DI/KinkConsentManagerDocumentationOptions.cs`.
  - **Reaproveitamento SDK:** `AddSmartCoreHubMediatRAdapter`, `IApplicationDispatcher`, `IHasValidationPayload<T>`, `ITransactionalCommand`, `AddAspNetCoreApiBasics`, `AddSdkCorePrimitives`, `AddApiPerformance`, `AddCustomSwagger`, `AddCustomOpenApi`, `AddCustomCors`, `ValidateNoCircularDependencies`, `UseSdkNetworkAndCrossCutting`, `UseSdkCorsAndDocumentation`, `UseSdkSecurityAndEndpoints<T>`, `InitializeDatabaseAtStartup<T>`.
  - **Verificação:** `DependencyInjectionGraphTests.cs` aprovado confirmando que `ValidateNoCircularDependencies()` passa sem exceções.
  - **DoD:** `WebApplicationBuilderServicesConfigure` e `WebApplicationExtensions` espelhando fielmente o `SmartCoreHub.Service`.

- [x] **B1.11 — Criar Suíte de Testes Unitários do Core (`KinkConsentManager.Core.Tests`)**
  - **Camada:** Core.Tests (`Core/KinkConsentManager.Core.Tests/`)
  - **Artefatos:** `Domain/Validators/*Tests.cs`, `Infrastructure/*Tests.cs`, `Service/Localization/ValidationMessageServiceTests.cs`, `Service/Services/AuthenticationServiceTests.cs`, `Service/Security/JwtTokenServiceTests.cs`, `Service/Cqrs/AuthenticationCqrsTests.cs`, `Service/DI/DependencyInjectionGraphTests.cs`.
  - **Verificação:** `dotnet test KinkConsentManager.sln -c Release --no-build --collect:"XPlat Code Coverage"` -> **`112/112` testes aprovados** (`LineRate=39,00% (679/1741)` considerando todo o assembly `Core` incluindo migrations e adapters DI).
  - **DoD:** Todos os testes com `// Cenário:` e `// Objetivo:` em português e nomes em inglês, utilizando `NUnit 4` + `Moq` + `AwesomeAssertions` + `Bogus`.

---

### Onda 3: API REST, OpenAPI, Health Checks e Testes End-to-End

- [x] **B1.12 — Implementar `Program.cs`, `appsettings*.json` e `Microsoft.EntityFrameworkCore.Design`**
  - **Camada:** API
  - **Artefatos:** `APIs/KinkConsentManager.API/Program.cs` (`public partial class Program`), `appsettings.json`, `appsettings.Development.json`, `KinkConsentManager.API.csproj` (`Microsoft.EntityFrameworkCore.Design` `PrivateAssets="all"`).
  - **Reaproveitamento SDK:** `LogAppHelper`, `SerilogAdapter`.
  - **Verificação:** Host inicializado via `CustomWebApplicationFactory` com `/health` e `/ready` validados na suíte de integração.
  - **DoD:** Zero credenciais no repositório; conexão ao Supabase e `TokenConfigurations:Secret` preparados para `dotnet user-secrets` ou variáveis de ambiente.

- [x] **B1.13 — Implementar `AuthController` Herdando `BaseApiController`**
  - **Camada:** API
  - **Artefatos:** `APIs/KinkConsentManager.API/Controllers/V1/AuthController.cs`.
  - **Reaproveitamento SDK:** `BaseApiController`, `IApplicationDispatcher`, `UserClaimsHelper`, `ServiceResponse<T>`.
  - **Verificação:** Testes unitários (`AuthControllerTests.cs`) e integração HTTP cobrindo os 5 endpoints (`register`, `login`, `refresh`, `logout`, `me`) e códigos `201`, `200`, `400`, `401` e `409`.
  - **DoD:** Documentação XML/Swagger completa e autenticação Bearer configurada em `AuthController`.

- [x] **B1.14 — Criar Suíte de Testes de Controller e Integração HTTP (`KinkConsentManager.API.Tests`)**
  - **Camada:** API.Tests (`APIs/KinkConsentManager.API.Tests/`)
  - **Artefatos:** `Controllers/AuthControllerTests.cs`, `Integration/CustomWebApplicationFactory.cs`, `Integration/AuthApiIntegrationTests.cs`.
  - **Verificação:** `dotnet test KinkConsentManager.sln -c Release --no-build --collect:"XPlat Code Coverage"` -> **`19/19` testes aprovados** em `KinkConsentManager.API.Tests` (`131/131` totais na solution, `0` warnings de compilação).
  - **DoD:** Endpoints `/api/v1/auth/*`, login dual (`login` ou `email`), negociação de idioma (`Accept-Language` / `X-Locale`) e `/health` + `/ready` validados de ponta a ponta.

---

## 3. Planejamento das Fases Seguintes (Etapas 2 e 3)

### Fase 2: Persistência e Recuperação do Report em `jsonb` (`UserKinkCheclists`)
- [ ] **B2.1** — Criar `UserKinkCheclistConfiguration` com `HasColumnType("jsonb")`, índice único em `UserKinkId`, token de concorrência em `Version` e índice GIN.
- [ ] **B2.2** — Criar e aplicar Migration `AddUserKinkCheclists` no schema `kink_consent` do Supabase.
- [ ] **B2.3** — Criar `UserKinkCheclistDto`, `UpsertUserKinkCheclistRequestDto`, `UpsertUserKinkCheclistRequestValidator` (validando `SchemaVersion`, `Language` e JSON válido) e `IUserKinkCheclistRepository`.
- [ ] **B2.4** — Implementar `UserKinkCheclistService` + comandos/queries CQRS (`UpsertUserKinkCheclistCommand`, `GetCurrentUserKinkCheclistQuery`, `DeleteCurrentUserKinkCheclistCommand`).
- [ ] **B2.5** — Implementar `ReportsController : BaseApiController` com rotas `GET /api/v1/reports/current`, `PUT /api/v1/reports/current` e `DELETE /api/v1/reports/current` (`[Authorize]`).
- [ ] **B2.6** — Configurar `RequestSizeLimitMiddleware` com limite adequado para o payload JSON de respostas.
- [ ] **B2.7** — Criar testes unitários e de integração com PostgreSQL real (`Testcontainers`) validando serialização `jsonb`, concorrência otimista (`409`) e isolamento por `UserKinkId`.

### Fase 3: Integração Frontend (`frontend/` — Angular 22 + Padrão 4+1 + i18n)
- [ ] **B3.1** — Criar contratos TypeScript em `frontend/src/app/core/models/auth.model.ts` e `service-response.model.ts` alinhados ao `ServiceResponse<T>`.
- [ ] **B3.2** — Implementar `AuthService` (Signals `currentUser`, `isAuthenticated`, armazenamento seguro de tokens, auto-refresh) + `authInterceptor`.
- [ ] **B3.3** — Implementar `CloudReportService` estendendo `BaseDataService` para `GET/PUT/DELETE /api/v1/reports/current`.
- [ ] **B3.4** — Criar componente modal `AuthModalComponent` (padrão 4+1, `OnPush`, zero template inline, sem strings hardcoded — 100% em `pt-BR.json` e `en-US.json` validado por `npm.cmd run check:i18n`).
- [ ] **B3.5** — Adicionar botão/menu de conta no `AppHeaderComponent` (Login / Cadastro / Perfil / Logout).
- [ ] **B3.6** — Adicionar chave seletora *"Salvar na nuvem"* (`CloudAutosaveToggleComponent`, padrão 4+1) na tela `/checklist/fill`, com convite de login para visitantes e 4 estados visuais para usuários logados.
- [ ] **B3.7** — Conectar `ChecklistAutosaveService` para disparar *debounce* de 2,5s com *dirty-checking* enviando `PUT /api/v1/reports/current` quando logado e toggle ativado.
- [ ] **B3.8** — Implementar resolução de conflitos Local vs. Nuvem com `SweetAlertService` e validar suíte Jest (`npm.cmd run test:coverage`) + `npm.cmd run check:i18n`.

---

## 4. Matriz de Riscos Técnicos e Mitigações

| Risco Identificado | Impacto | Probabilidade | Mitigação Documentada |
| :--- | :---: | :---: | :--- |
| **Conflito de versão EF Core 10 vs. `SmartCoreHub.Core.SDK` (EF 9)** | Alto (Erro de restore NuGet) | Alta se não pinado | Fixar `Microsoft.EntityFrameworkCore` `9.0.23` e `Npgsql.EntityFrameworkCore.PostgreSQL` `9.0.4` no `Directory.Packages.props`. |
| **Chave JWT menor que 64 bytes no `HS512` (`IDX10720`)** | Alto (API quebra no login) | Média | `AuthenticationExtensions` valida no startup `Encoding.UTF8.GetByteCount(Secret) >= 64` e falha cedo com mensagem clara. |
| **Uso de Transaction Pooler (`6543`) para EF Migrations** | Alto (Lock/DDL falha no Supabase) | Média | Executar `dotnet ef database update` sempre via **Direct Connection (`5432`)** ou Session Pooler; usar `Database:SkipInitialization=true` em runtime atrás de pooler transacional. |
| **Tabela `__EFMigrationsHistory` criada no schema `public`** | Médio (Poluição do Supabase) | Alta se omitido | Passar explicitamente o segundo argumento `KinkConsentManagerDbContext.DefaultSchema` em `MigrationsHistoryTable(EfMigrationsHistoryHelper.PostgreSqlTable, "kink_consent")`. |
| **Comparação *case-sensitive* padrão no PostgreSQL (Supabase)** | Alto (Falha de login/duplicidade com variação de maiúsculas) | Alta se não normalizado | Persistir `NormalizedLogin` (`ToLowerInvariant()`) indexado como `UNIQUE` e usar o Value Object `Email` do Core.SDK; buscar sempre via `GetByLoginOrEmailAsync` com tratamento seguro para `@` malformado. |
| **Avaliação *eager* de idioma no construtor do FluentValidation** | Médio (Mensagens congeladas no 1º idioma) | Alta se usar string direta | Todos os validadores devem usar expressão lambda (`.WithMessage(_ => _messages.GetMessage(...))`) para resolver `CultureInfo.CurrentUICulture` por requisição. |
| **Vazamento de segredos em JSON ou Markdown** | Crítico | Baixa | `appsettings.json` sempre com strings vazias; desenvolvimento usa `dotnet user-secrets` e produção usa variáveis de ambiente/Azure Key Vault. |
| **Violação de `R-GOV-GIT` durante automação** | Médio | Baixa | Nenhuma automação executa `git commit`, `git push` ou troca de branch; alterações ficam locais até revisão humana. |

---

## 5. Definition of Done (DoD) Obrigatório por Tarefa

Uma tarefa só pode ser marcada como `[x] Concluído` quando cumprir todos os critérios abaixo:
1. **Build Limpo:** `dotnet build -c Release` com `0` erros e `0` warnings (`TreatWarningsAsErrors = true`).
2. **Reaproveitamento SDK Verificado:** Nenhuma classe utilitária, envelope, VO ou hasher existente no `SmartCoreHub.Core.SDK` foi reimplementado no projeto consumidor.
3. **Validadores Desacoplados e Multi-idioma:** Nenhum validador (`PasswordValidator` ou qualquer outro) pode conter strings fixas fora de `.resx` ou acessar `ResourceManager`/`HttpContext` diretamente — todos usam `IValidationMessageService` com lambda dinâmica + `WithMessageKey`.
4. **Banco Isolado:** Todas as tabelas e histórico de migrations pertencem exclusivamente ao schema `kink_consent`.
5. **Qualidade de Testes:** Testes unitários/integração em NUnit + AwesomeAssertions passando 100%, cobrindo cenários positivos, bordas e erros, com comentários `// Cenário:` e `// Objetivo:` em português.
6. **Segurança & Privacidade:** Zero segredos commitados e zero logs contendo senhas, tokens brutos ou respostas de checklist.
