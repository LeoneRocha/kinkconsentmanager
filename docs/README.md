# Documentação do SmartCoreHub

Índice central para onboarding, arquitetura, APIs, SDKs, operação e histórico técnico. Comece pelo percurso abaixo e use as especificações OpenAPI em execução como fonte atual dos endpoints.

Comentários de código ficam em português. Validações, logs, exceções e mensagens de retorno da API ficam em inglês ([diretrizes](PROJECT_GUIDELINES.md#14-principios-gerais)).

## Stack e recursos

O catálogo com versões está em [Arquitetura — catálogo](ARCHITECTURE.md#catálogo-de-tecnologias-e-recursos) e na [stack de referência](PROJECT_GUIDELINES.md#26-stack-de-referencia). Resumo lido em 23/10/2026:

| Área | O que o repositório usa |
|---|---|
| Backend | .NET SDK 10.0.300, ASP.NET Core 10.0.13, EF Core 9.0.20 (Pomelo MySQL 9 ainda não acompanha o EF 10) |
| Dados | MySQL padrão, SQL Server, PostgreSQL, InMemory, SQLite e Dapper |
| Aplicação | CQRS por `IApplicationDispatcher`, MediatR 12.5.0 só no adapter, FluentValidation 12.2, AutoMapper 16.2 atrás de `ISmartCoreHubMapper` |
| Segurança | JWT Bearer, API Key `X-Auth-Token`, MFA, BCrypt |
| Cultura da API | `X-Locale` vence `Accept-Language`; culturas funcionais `en-US`, `pt-BR` e `es-ES` |
| Painel | Angular 22.2, Material, PrimeNG 21, ngx-translate 17, TypeScript 6, Jest 30 |
| Idiomas da tela | `pt-BR`, `en-US`, `es-ES`, `fr-FR`, `de-DE`, `ja-JP`, `zh-CN` |
| Outras superfícies | Landing React 19 + Vite, SDK .NET, SDK TypeScript, extensões VS Code/Cursor, servidores MCP |
| Nuvem e cache | Azure Blob, Queue, Table, Cosmos, Redis, MongoDB |
| Observabilidade | Serilog, Application Insights, OpenTelemetry |
| Orquestração | Aspire Hosting 13.6.2, opt-in. Produção continua no Azure App Service |
| OpenAPI | Swagger, Scalar, ReDoc, RapiDoc |

Recursos da API principal: autenticação e MFA, usuários, perfis e escopos, tenants, aplicações, configuração, tokens e telemetria, métricas de uso, planos, assinaturas e cobrança, nuvem, localização, templates de notificação e auditoria. O detalhe está em [PROJECT_GUIDELINES.md — recursos](PROJECT_GUIDELINES.md#27-recursos-da-plataforma).

Em 23/10/2026 a suíte do backend passou **6.808** testes e a do painel passou **3.119** testes em **230** suítes. Esses totais não são meta fixa.

## Estrutura desta pasta

| Pasta / arquivo | Conteúdo |
|---|---|
| [`PROJECT_GUIDELINES.md`](PROJECT_GUIDELINES.md) | Diretrizes transversais de implementação |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Arquitetura em camadas |
| [`CQRS/`](CQRS/) | Visão CQRS e guia de implementação |
| [`ASPIRE/`](ASPIRE/) | Guias operacionais do AppHost Aspire |
| [`General/Outros/`](General/Outros/) | Guias de onboarding, Docker, EF, frontend, releases |
| [`Features/`](Features/) | Specs ativas (`Pendding/`, `In Progress/`) e [`Done/`](Features/Done/) (histórico) |
| [`COVERAGE AND TEST/`](COVERAGE AND TEST/) | Cobertura e testes |
| [`Ressources/`](Ressources/), [`result/`](result/), [`TXT/`](TXT/) | Material auxiliar / histórico |

## Percurso recomendado

1. Leia a [visão geral e o início rápido](../README.md).
2. Consulte as [diretrizes do projeto](PROJECT_GUIDELINES.md).
3. Prepare o ambiente com o [Guia do Desenvolvedor](General/Outros/DEVELOPER-GUIDE.md).
4. Entenda as camadas em [Arquitetura](ARCHITECTURE.md).
5. Execute uma API e abra uma das [UIs de documentação](Features/FEITOS/API-DOCUMENTATION-UI.md).
6. Consulte os READMEs da [API principal](../backend/APIs/SmartCoreHub.API/README.md), da [API de localização](../backend/APIs/SmartCoreHub.Localization.API/README.md) ou do SDK relevante.

## Guias principais

| Tema | Documento |
|---|---|
| Diretrizes do projeto | [PROJECT_GUIDELINES.md](PROJECT_GUIDELINES.md) |
| Recursos implementados e releases | [General/Outros/FEATURES-AND-RELEASES.md](General/Outros/FEATURES-AND-RELEASES.md) |
| Desenvolvimento local | [General/Outros/DEVELOPER-GUIDE.md](General/Outros/DEVELOPER-GUIDE.md) |
| Arquitetura | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Infraestrutura das APIs | [General/Outros/API-Infrastructure.md](General/Outros/API-Infrastructure.md) |
| API REST | [General/Outros/api-README.md](General/Outros/api-README.md) |
| Swagger, Scalar, ReDoc, RapiDoc e OpenAPI | [Features/FEITOS/API-DOCUMENTATION-UI.md](Features/FEITOS/API-DOCUMENTATION-UI.md) |
| Extração Service → Core.SDK | [Features/FEITOS/SmartCoreHub.Core.SDK/SmartCoreHub.Core.SDK-Service-Extracao.md](Features/FEITOS/SmartCoreHub.Core.SDK/SmartCoreHub.Core.SDK-Service-Extracao.md) |
| Core.SDK — Extensões IDE (requisitos) | [Features/SmartCoreHub.Core.SDK-Extensões-IDE/SmartCoreHub.Core.SDK-Extensões-IDE-Requisitos.md](Features/SmartCoreHub.Core.SDK-Extensões-IDE/SmartCoreHub.Core.SDK-Extensões-IDE-Requisitos.md) |
| Renovação de Tokens CI/CD (Extensões e Pacotes) | [GUIA-RENOVACAO-TOKENS-PUBLICACAO.md](GUIA-RENOVACAO-TOKENS-PUBLICACAO.md) |
| Refatoração DI/pipeline | [Features/FEITOS/WEBAPPLICATION-DI-REFACTOR-SURVEY.md](Features/FEITOS/WEBAPPLICATION-DI-REFACTOR-SURVEY.md) |
| Docker e Compose | [General/Outros/DOCKER-AND-COMPOSE-GUIDE.md](General/Outros/DOCKER-AND-COMPOSE-GUIDE.md) |
| Migrações EF Core (multi-provider + trocar para PostgreSQL) | [General/Outros/EF-MIGRATIONS-HOWTO.md](General/Outros/EF-MIGRATIONS-HOWTO.md) |
| Frontend Angular | [General/Outros/frontend-README.md](General/Outros/frontend-README.md) |
| Referência Jest | [General/Outros/JEST-REFERENCE.md](General/Outros/JEST-REFERENCE.md) |
| Cobertura e testes | [COVERAGE AND TEST/coverage.md](COVERAGE AND TEST/coverage.md) |
| CQRS — visão do fluxo | [CQRS/CQRS.md](CQRS/CQRS.md) |
| CQRS — como implementar | [CQRS/CQRS-Como-Implementar-Dicas.md](CQRS/CQRS-Como-Implementar-Dicas.md) |
| Mensagens funcionais da API | [Features/Pendding/PADRONIZACAO-IDIOMA-I18N-E-CENTRALIZACAO-MENSAGENS/04-GUIA-DE-USO-E-IMPLEMENTACAO.md](Features/Pendding/PADRONIZACAO-IDIOMA-I18N-E-CENTRALIZACAO-MENSAGENS/04-GUIA-DE-USO-E-IMPLEMENTACAO.md) |
| MFA | [Features/Done/MULTI-FACTOR AUTHENTICATION/01-LEVANTAMENTO-FUNCIONAL-E-TECNICO.md](Features/Done/MULTI-FACTOR%20AUTHENTICATION/01-LEVANTAMENTO-FUNCIONAL-E-TECNICO.md) |
| Aspire — várias APIs no AppHost | [ASPIRE/MULTIPLE-APIS.md](ASPIRE/MULTIPLE-APIS.md) |
| Aspire + CQRS (requisitos) | [Features/SmartCoreHub-Aspire-CQRS-MediatR/SmartCoreHub-Aspire-CQRS-MediatR-Requisitos.md](Features/SmartCoreHub-Aspire-CQRS-MediatR/SmartCoreHub-Aspire-CQRS-MediatR-Requisitos.md) |

## APIs

- [SmartCoreHub.API — execução, configuração, documentação e testes](../backend/APIs/SmartCoreHub.API/README.md)
- [SmartCoreHub.Localization.API — execução, configuração, documentação e testes](../backend/APIs/SmartCoreHub.Localization.API/README.md)
- [Requisitos da Localization API](General/Outros/SmartCoreHub.Localization.API-Requisitos.md)

### Bases por contexto

| Contexto | SmartCoreHub.API | SmartCoreHub.Localization.API |
|---|---|---|
| Local HTTPS (`dotnet run`) | `https://localhost:53814` | `https://localhost:61115` |
| Local HTTP (`dotnet run`) | `http://localhost:53815` | `http://localhost:61116` |
| `backend/docker-compose.yml` | `http://localhost:80` | `http://localhost:8081` |
| `docker-compose.yml`, perfil `production` | `http://localhost:5000` | não incluída |
| Produção | `https://smartcorehubapi-grajbyfdaggxefgj.brazilsouth-01.azurewebsites.net` | `https://smartcorehublocalizationapi-e3c2esbdcxdfb5gu.brazilsouth-01.azurewebsites.net` |

### Rotas compartilhadas de documentação e saúde

Implementação reutilizável: [`SmartCoreHub.Core.SDK.Service.API.DI.*`](../backend/Core/SmartCoreHub.Core.SDK/README.md). Composição e branding SmartCoreHub: [`SmartCoreHub.Service`](../backend/Implementations/SmartCoreHub.Service/README.md).

Acrescente a rota à base desejada:

| Recurso | Rota |
|---|---|
| Raiz, redireciona para Swagger UI | `/` |
| Compatibilidade, redireciona para Swagger UI | `/index.html` |
| Swagger UI | `/swagger` ou `/swagger/index.html` |
| JSON Swashbuckle | `/swagger/v1/swagger.json` |
| JSON OpenAPI nativo do ASP.NET | `/openapi/v1.json` |
| Atalho, redireciona para Scalar | `/openapi` |
| Scalar | `/scalar/v1` |
| ReDoc | `/redoc` |
| RapiDoc | `/rapidoc` |
| Liveness | `/health` |
| Readiness | `/ready` |
| Alias de readiness (somente Localization API) | `/health/ready` |

### Links diretos locais

| API e protocolo | Swagger | Scalar | ReDoc | RapiDoc | OpenAPI nativo | Swagger JSON |
|---|---|---|---|---|---|---|
| Principal HTTPS | [Swagger](https://localhost:53814/swagger/index.html) | [Scalar](https://localhost:53814/scalar/v1) | [ReDoc](https://localhost:53814/redoc) | [RapiDoc](https://localhost:53814/rapidoc) | [JSON](https://localhost:53814/openapi/v1.json) | [JSON](https://localhost:53814/swagger/v1/swagger.json) |
| Principal HTTP | [Swagger](http://localhost:53815/swagger/index.html) | [Scalar](http://localhost:53815/scalar/v1) | [ReDoc](http://localhost:53815/redoc) | [RapiDoc](http://localhost:53815/rapidoc) | [JSON](http://localhost:53815/openapi/v1.json) | [JSON](http://localhost:53815/swagger/v1/swagger.json) |
| Localização HTTPS | [Swagger](https://localhost:61115/swagger/index.html) | [Scalar](https://localhost:61115/scalar/v1) | [ReDoc](https://localhost:61115/redoc) | [RapiDoc](https://localhost:61115/rapidoc) | [JSON](https://localhost:61115/openapi/v1.json) | [JSON](https://localhost:61115/swagger/v1/swagger.json) |
| Localização HTTP | [Swagger](http://localhost:61116/swagger/index.html) | [Scalar](http://localhost:61116/scalar/v1) | [ReDoc](http://localhost:61116/redoc) | [RapiDoc](http://localhost:61116/rapidoc) | [JSON](http://localhost:61116/openapi/v1.json) | [JSON](http://localhost:61116/swagger/v1/swagger.json) |

### Links diretos Docker

| Contexto | Swagger | Scalar | ReDoc | RapiDoc | OpenAPI nativo | Swagger JSON |
|---|---|---|---|---|---|---|
| Principal, `backend/docker-compose.yml` | [Swagger](http://localhost:80/swagger/index.html) | [Scalar](http://localhost:80/scalar/v1) | [ReDoc](http://localhost:80/redoc) | [RapiDoc](http://localhost:80/rapidoc) | [JSON](http://localhost:80/openapi/v1.json) | [JSON](http://localhost:80/swagger/v1/swagger.json) |
| Localização, `backend/docker-compose.yml` | [Swagger](http://localhost:8081/swagger/index.html) | [Scalar](http://localhost:8081/scalar/v1) | [ReDoc](http://localhost:8081/redoc) | [RapiDoc](http://localhost:8081/rapidoc) | [JSON](http://localhost:8081/openapi/v1.json) | [JSON](http://localhost:8081/swagger/v1/swagger.json) |
| Principal, Compose raiz `production` | [Swagger](http://localhost:5000/swagger/index.html) | [Scalar](http://localhost:5000/scalar/v1) | [ReDoc](http://localhost:5000/redoc) | [RapiDoc](http://localhost:5000/rapidoc) | [JSON](http://localhost:5000/openapi/v1.json) | [JSON](http://localhost:5000/swagger/v1/swagger.json) |

### Links diretos de produção

A disponibilidade pode depender da política do deployment, proxy ou gateway.

| API | Swagger | Scalar | ReDoc | RapiDoc | OpenAPI nativo | Swagger JSON |
|---|---|---|---|---|---|---|
| Principal | [Swagger](https://smartcorehubapi-grajbyfdaggxefgj.brazilsouth-01.azurewebsites.net/swagger/index.html) | [Scalar](https://smartcorehubapi-grajbyfdaggxefgj.brazilsouth-01.azurewebsites.net/scalar/v1) | [ReDoc](https://smartcorehubapi-grajbyfdaggxefgj.brazilsouth-01.azurewebsites.net/redoc) | [RapiDoc](https://smartcorehubapi-grajbyfdaggxefgj.brazilsouth-01.azurewebsites.net/rapidoc) | [JSON](https://smartcorehubapi-grajbyfdaggxefgj.brazilsouth-01.azurewebsites.net/openapi/v1.json) | [JSON](https://smartcorehubapi-grajbyfdaggxefgj.brazilsouth-01.azurewebsites.net/swagger/v1/swagger.json) |
| Localização | [Swagger](https://smartcorehublocalizationapi-e3c2esbdcxdfb5gu.brazilsouth-01.azurewebsites.net/swagger/index.html) | [Scalar](https://smartcorehublocalizationapi-e3c2esbdcxdfb5gu.brazilsouth-01.azurewebsites.net/scalar/v1) | [ReDoc](https://smartcorehublocalizationapi-e3c2esbdcxdfb5gu.brazilsouth-01.azurewebsites.net/redoc) | [RapiDoc](https://smartcorehublocalizationapi-e3c2esbdcxdfb5gu.brazilsouth-01.azurewebsites.net/rapidoc) | [JSON](https://smartcorehublocalizationapi-e3c2esbdcxdfb5gu.brazilsouth-01.azurewebsites.net/openapi/v1.json) | [JSON](https://smartcorehublocalizationapi-e3c2esbdcxdfb5gu.brazilsouth-01.azurewebsites.net/swagger/v1/swagger.json) |

## SDKs e pacotes

- [SmartCoreHub.Core.SDK — catálogo detalhado](../backend/Core/SmartCoreHub.Core.SDK/README.md)
- [SmartCoreHub.Service — composição do host](../backend/Implementations/SmartCoreHub.Service/README.md)
- [Refatoração DI/pipeline — implementação e validação](Features/FEITOS/WEBAPPLICATION-DI-REFACTOR-SURVEY.md)
- [SmartCoreHub.Localization.SDK](../backend/SDKs/SmartCoreHub.Localization.SDK/README.md)
- [Extração Service → Core](Features/FEITOS/SmartCoreHub.Core.SDK/SmartCoreHub.Core.SDK-Service-Extracao.md)
- [Remoção de shims Core.SDK](Features/FEITOS/SmartCoreHub.Core.SDK/SmartCoreHub.Core.SDK-Remocao-Shims.md)
- [Isolamento Localization.SDK](Features/FEITOS/SmartCoreHub.Core.SDK/SmartCoreHub.Localization.SDK-Isolamento-Core.md)
- [Unificar CloudClientSDK → Core.SDK Client.Cloud (requisitos)](Features/SmartCoreHub.Core.SDK-ClientCloud/SmartCoreHub.Core.SDK-ClientCloud-Requisitos.md)
- [Unificar CloudClientSDK → Core.SDK Client.Cloud (plano)](Features/SmartCoreHub.Core.SDK-ClientCloud/SmartCoreHub.Core.SDK-ClientCloud-PlanoImplementacao.md)
- [Publicação do Localization SDK](Features/FEITOS/NUGET-SDK-LOCALIZATION.md)
- [Roadmap de multitarget dos SDKs](Features/FEITOS/SDK-MULTITARGET-ROADMAP.md)
- [Publicação NuGet com PowerShell](Features/FEITOS/NUGET-PUBLISH-POWERSHELL-ONLY.md)
- [Publicação por pipeline clássico](Features/FEITOS/NUGET-CLASSIC-PIPELINE-PUBLISH-ONLY.md)

## Operação, pipeline e configuração

- [Checklist de pipeline da Localization API](Features/FEITOS/AZURE-PIPELINE-LOCALIZATION-CHECKLIST.md)
- [Migração de secrets por ambiente](Features/FEATURE-ENV-SECRETS-MIGRATION-SPEC.md)
- [Guia genérico de atualização de pacotes Backend (CPM)](Backend/UpdatePackages/GuiaGenericoAtualizacaoPacotes.md)
- [Guia específico de atualização de pacotes Backend (SmartCoreHub)](Backend/UpdatePackages/GuiaAtualizacaoPacotes-SmartCoreHub.md)
- [Conjunto homologado de pacotes Backend (2026-08)](Backend/UpdatePackages/2026-08-ConjuntoHomologado.md)
- [Guia genérico de atualização de pacotes Frontend (npm)](FrontEnd/UpdatePackages/GuiaGenericoAtualizacaoPacotesFrontend.md)
- [Guia específico de atualização de pacotes Frontend (SmartCoreHub UI)](FrontEnd/UpdatePackages/GuiaAtualizacaoPacotes-SmartCoreHubUI.md)
- [Conjunto homologado de pacotes Frontend (2026-08)](FrontEnd/UpdatePackages/2026-08-ConjuntoHomologado-Frontend.md)
- [AppHost Aspire unificado](../infra/aspire/smartcorehub-api/README.md)

## Features, decisões e histórico

- [`Features/`](Features/) contém especificações em andamento e iniciativas técnicas.
- [`Features/Done/UserAccess/FEATURE-USER-ACCESS-MELHORIAS-E-EVOLUCAO.md`](Features/Done/UserAccess/FEATURE-USER-ACCESS-MELHORIAS-E-EVOLUCAO.md) — **melhorias de processo, segurança (Read vs Write) e arquitetura multi-banco** (documento de evolução e auditoria).
- [`Features/Done/UserAccess/FEATURE-USER-ACCESS-HOW-TO-IMPLEMENT.md`](Features/Done/UserAccess/FEATURE-USER-ACCESS-HOW-TO-IMPLEMENT.md) — **como implementar** AuthZ / escopos / membership (guia exclusivo).
- [`Features/Done/UserAccess/FEATURE-USER-MANAGEMENT-SCOPES-AND-PERMISSIONS-SPEC.md`](Features/Done/UserAccess/FEATURE-USER-MANAGEMENT-SCOPES-AND-PERMISSIONS-SPEC.md) — requisitos IAM (usuários, perfis, escopos).
- [`Features/Done/UserAccess/FEATURE-USER-ACCESS-AUTHZ-FLUENT-VS-ATTRIBUTE.md`](Features/Done/UserAccess/FEATURE-USER-ACCESS-AUTHZ-FLUENT-VS-ATTRIBUTE.md) — guia AuthZ XOR (Fluent vs Attribute) + mapa de exemplos.
- [`Features/Done/UserAccess/FEATURE-USER-MANAGEMENT-SCOPES-AND-PERMISSIONS-PROGRESSO.md`](Features/Done/UserAccess/FEATURE-USER-MANAGEMENT-SCOPES-AND-PERMISSIONS-PROGRESSO.md) — progresso e etapas (rastreabilidade).
- [`Features/Done/UserAccess/FEATURE-USER-MANAGEMENT-SCOPES-AND-PERMISSIONS-PlanoImplementacao.md`](Features/Done/UserAccess/FEATURE-USER-MANAGEMENT-SCOPES-AND-PERMISSIONS-PlanoImplementacao.md) — plano geral + Backend / Frontend / Validação CRUD.
- [`Features/Done/UserAccess/FEATURE-USER-MANAGEMENT-SCOPES-AND-PERMISSIONS-PlanoImplementacao-Frontend.md`](Features/Done/UserAccess/FEATURE-USER-MANAGEMENT-SCOPES-AND-PERMISSIONS-PlanoImplementacao-Frontend.md) — plano de implementação Frontend (guards, diretivas e UX de permissões).
- [`Features/Done/`](Features/Done/) registra especificações e implementações concluídas (ex.: [`UserAccess/`](Features/Done/UserAccess/)).
- [`Features/Pendding/`](Features/Pendding/) contém specs ainda em andamento.
- [`Features/Pendding/PADRONIZACAO-IDIOMA-I18N-E-CENTRALIZACAO-MENSAGENS/04-GUIA-DE-USO-E-IMPLEMENTACAO.md`](Features/Pendding/PADRONIZACAO-IDIOMA-I18N-E-CENTRALIZACAO-MENSAGENS/04-GUIA-DE-USO-E-IMPLEMENTACAO.md) — **como usar** a mensagem funcional da API (`WithMessageKey`, `X-Locale` e os dois planos de localização).
- [`Features/MCP/`](Features/MCP/) reúne documentação de integração MCP.
- [`Features/SmartCoreHub-Aspire-CQRS-MediatR/`](Features/SmartCoreHub-Aspire-CQRS-MediatR/) requisitos e plano Aspire + CQRS.
- [`Features/SmartCoreHub.Core.SDK-ClientCloud/`](Features/SmartCoreHub.Core.SDK-ClientCloud/) unificação CloudClientSDK → `Client/Cloud` no Core.SDK.
- **Qualidade, Testes e Cobertura:**
  - [`Backend/COVERAGE AND TEST/`](Backend/COVERAGE%20AND%20TEST/) — Diretrizes de cobertura e saneamento de Code Smells .NET. A suíte de 23/10/2026 passou 6.808 testes.
    - [Guia Genérico de Cobertura Backend](Backend/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Backend-Generico.md)
    - [Guia Específico de Cobertura Backend (SmartCoreHub)](Backend/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Backend-SmartCoreHub.md)
    - [Guia Genérico de Code Smells Backend](Backend/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-Backend-Generico.md)
    - [Guia Específico de Code Smells Backend (SmartCoreHub)](Backend/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-Backend-SmartCoreHub.md)
  - [`FrontEnd/COVERAGE AND TEST/`](FrontEnd/COVERAGE%20AND%20TEST/) — Diretrizes de cobertura e saneamento de Code Smells TypeScript/Angular/React. A suíte Jest do painel em 23/10/2026 passou 3.119 testes.
    - [Guia Genérico de Cobertura Frontend](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Frontend-Generico.md)
    - [Guia Específico de Cobertura Frontend (SmartCoreHub)](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Frontend-SmartCoreHub.md)
    - [Guia Genérico de Code Smells Frontend](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-Frontend-Generico.md)
    - [Guia Específico de Code Smells (SmartCoreHub UI)](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-SmartCoreHubUI.md)
    - [Guia Específico de Code Smells (Localization SDK)](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-LocalizationSdkTypeScript.md)
    - [Guia Específico de Code Smells (Landing Page React)](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-LandingPage-React.md)
    - [Guia Específico de Code Smells (Exemplo Angular)](FrontEnd/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-FrontendSdkExample-Angular.md)
- [`General/Outros/`](General/Outros/) contém guias operacionais e material auxiliar; confirme a atualidade antes de usá-lo como instrução normativa (para regras, prefira `PROJECT_GUIDELINES.md`).

## Segurança

Não coloque secrets, connection strings reais, tokens, certificados ou credenciais em Markdown, `appsettings*.json` versionado ou arquivos Compose. Use User Secrets no desenvolvimento e configuração protegida no ambiente de deployment.

## Licença

Os componentes podem possuir licenças próprias. Consulte o arquivo `LICENSE` do projeto que será usado, em especial [SmartCoreHub.API/LICENSE](../backend/APIs/SmartCoreHub.API/LICENSE) e [SmartCoreHub.Localization.API/LICENSE](../backend/APIs/SmartCoreHub.Localization.API/LICENSE).
