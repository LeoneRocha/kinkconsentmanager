# Documentação — KinkConsentManager

Índice central para onboarding, arquitetura, diretrizes de código, especificação V1, testes Jest, qualidade estática, containers e atualização de pacotes do **KinkConsentManager**.

- **Escopo atual (V1):** SPA **100% client-side** para Painel Inicial (`/dashboard`), seleção de modo (`/checklist`), preenchimento do Checklist (`/checklist/fill`) e Prévia/Exportação segura (`/checklist/export`), sem envio de dados a servidor.
- **Backend:** **Coming Soon (Roadmap V2+)** — o servidor/API ainda não existe neste repositório na V1; veja a seção [Backend (Coming Soon)](#backend-coming-soon).

Documentação e comentários de contexto ficam em **português**; código, símbolos e nomes de testes (`describe`/`it`) ficam em **inglês**; textos de UI residem nos dicionários `assets/i18n/` ([PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md#13-princípios-gerais)).

---

## Stack e Recursos (Baseline `v1.2.4` — `2026-11-25`)

As versões vivas constam em [frontend/package.json](../frontend/package.json), [Arquitetura — catálogo](./ARCHITECTURE.md#10-catálogo-de-tecnologias-e-recursos) e [Conjunto Homologado Frontend](./Frontend/UpdatePackages/2026-11-22-ConjuntoHomologado-Frontend.md).

| Área | O que o repositório usa hoje |
| ---- | ---------------------------- |
| Frontend (V1 ativo) | Angular `^22.1.0` (Standalone, Signals, **zoneless**, `OnPush`), TypeScript `~6.0.2`, RxJS `~7.8.0` |
| Design System, Ícones & Temas | **Angular Material** `^22.3.0`, `@angular/cdk` `^22.3.0`, **Font Awesome Free** `^7.0.1` (SVG + CSS), `sweetalert2` `^11.26.25`, `@popperjs/core` `^2.11.8`, tipografia `Nunito`, sistema modular de **3 temas** (`core/themes/`: *Sóbrio P&B com azul/degradê*, *Claro Vermelho*, *Escuro Vermelho*) com autodetecção inicial de `prefers-color-scheme` e padronização de botões (verde/cinza em formulários; transparente vazado em navegação/entrada) |
| Rotas Modulares & Acessibilidade | `core/routes/app-routes.config.ts` (`/dashboard`, `/checklist`, `/checklist/fill`, `/checklist/export`), `checklistFillGuard`, navegação pelo título `.app-shell__brand-title`, leitor audiovisual por `(focusin)` + Web Speech API + legendas ao vivo + `alt`/`title` em todos os templates |
| Internacionalização | `@ngx-translate/core` `^18.1.0` e `@ngx-translate/http-loader` `^18.1.0` com `CompositeTranslateLoader` (`pt-BR`, `en-US`, `groups/`, `questions/`), autodetecção inicial do idioma do navegador (`navigator.languages` / `navigator.language`) no `provideAppInitializer` e verificação `npm.cmd run check:i18n` (**66/66** chaves) |
| Schema, Segurança & Preferências | Schema `checklist-v1.json` com **6 escalas** (`not_applicable` — *Não se aplica*) e metadados `participantRoles` + `groupId` por grupo/pergunta (`ISchemaRepository`) + autosave criptografado Web Crypto AES-GCM (`CryptoService`, `ChecklistAutosaveService`, `BrowserStorageRepository`) + `UserPreferencesRepository`, `ThemeService` e `AccessibilityService` |
| Web Workers & Exportação Client-Side | Worker unificado (`core/workers/`) com delay configurável por variável de ambiente (`WORKER_LOADING_DELAY_MS`, padrão `3000ms`): **PNG** (`html-to-image` `^1.11.13`), **PDF** (`pdfmake` `^0.3.15`), **XLSX** OOXML modular (layouts Moderno pastel e Clássico paisagem), **Imprimir** (`window.print()` + `@media print`), **JSON Draft** e **CSV** UTF-8 BOM |
| Camada Genérica CRUD | `ICrudOperations`, `BaseDataService`, `BaseCrudService`, `ICrudRepository`, `BaseCrudRepository`, `API_BASE_URL` |
| Testes & Cobertura | **Jest** `^30.5.2`, `jest-preset-angular` `^17.0.3`, `jest-environment-jsdom` `^30.5.2`, `jsdom` `^28.0.0` |
| Qualidade & Reporters | Prettier `^3.8.1`, SonarCloud (`sonar-project.properties`), `jest-junit`, `jest-sonar`, `jest-stare`, `jest-html-reporter`, `jest-html-reporters` |
| Infraestrutura & Containers | Docker multi-stage ([Dockerfile](../frontend/Dockerfile)), Nginx Alpine com CSP e `/health` ([nginx.conf](../frontend/nginx.conf)), Compose e DevContainers |
| **Backend** | **Coming Soon (Roadmap V2+)** — sem implementação na V1; contrato preparatório genérico documentado |

**Baseline verificado (`v1.2.4` — `2026-11-25`):** **73 arquivos `.spec.ts`** / **301 testes unitários aprovados (100%)**, cobertura global Jest de **91,79% Statements / 91,54% Lines / 92,23% Functions / 75,43% Branches**, builds `build` e `build:prod` limpos, **66/66** chaves i18n sincronizadas e formatação Prettier verificada.

---

## Estrutura desta Pasta (`docs/`)

| Pasta / Arquivo | Conteúdo |
| --------------- | -------- |
| [`PROJECT_GUIDELINES.md`](./PROJECT_GUIDELINES.md) | Diretrizes normativas transversais, padrões 4+1, Jest, Git (`R-GOV-GIT`) e Backend genérico |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Arquitetura em camadas, diagramas Mermaid, fluxos, exemplos e catálogo técnico |
| [`Blueprint.md`](./Blueprint.md) | Blueprint conceitual do produto e visão de roadmap futuro (pós-V1) |
| [`CHANGELOG_MELHORIAS.md`](./CHANGELOG_MELHORIAS.md) | Resumo consolidado das melhorias de UX, layout, fluxo de entrada e conformidade técnica |
| [`Features/`](./Features/) | Levantamento funcional/técnico, plano modular de implementação (arquivados em `Features/Feito/`) e especificações futuras |
| [`Frontend/COVERAGE AND TEST/`](./Frontend/COVERAGE%20AND%20TEST/) | Diretrizes de cobertura Jest/Vitest, metas por camada e saneamento de Code Smells |
| [`Frontend/UpdatePackages/`](./Frontend/UpdatePackages/) | Guias de governança/atualização de pacotes npm e conjunto homologado atual |

---

## Percurso Recomendado de Onboarding

1. Entenda a visão geral do produto e o recorte entre V1 e futuro em [Blueprint.md](./Blueprint.md).
2. Leia as regras obrigatórias em [PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md).
3. Explore as camadas e fluxos do código em [ARCHITECTURE.md](./ARCHITECTURE.md).
4. Revise o escopo e a arquitetura detalhada da V1 em [LEVANTAMENTO_FUNCIONAL_TECNICO.md](./Features/Feito/LEVANTAMENTO_FUNCIONAL_TECNICO.md) e [PLANO_IMPLEMENTACAO_FRONTEND.md](./Features/Feito/PLANO_IMPLEMENTACAO_FRONTEND.md).
5. Confira os padrões de execução local em [frontend/README.md](../frontend/README.md), [Diretrizes de Cobertura](./Frontend/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Frontend-KinkConsentManager.md) e [Guia de Atualização de Pacotes](./Frontend/UpdatePackages/GuiaAtualizacaoPacotes-KinkConsentManagerUI.md).

---

## Índice Completo de Guias

### Documentos Core & Roadmap

| Tema | Documento |
| ---- | --------- |
| Visão Conceitual e Roadmap Futuro | [Blueprint.md](./Blueprint.md) |
| Arquitetura em Camadas e Decisões Técnicas | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Diretrizes Normativas do Projeto | [PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md) |
| Resumo de Alterações e Melhorias Recentes | [CHANGELOG_MELHORIAS.md](./CHANGELOG_MELHORIAS.md) |

### Especificação, Planejamento e Progresso V1

| Tema | Documento |
| ---- | --------- |
| Levantamento Funcional e Técnico (V1 Checklist) | [LEVANTAMENTO_FUNCIONAL_TECNICO.md](./Features/Feito/LEVANTAMENTO_FUNCIONAL_TECNICO.md) |
| Plano de Implementação Frontend | [PLANO_IMPLEMENTACAO_FRONTEND.md](./Features/Feito/PLANO_IMPLEMENTACAO_FRONTEND.md) |
| Checklist de Implementação, Etapas e Progresso | [CHECKLIST_IMPLEMENTACAO_PROGRESSO.md](./Features/Feito/CHECKLIST_IMPLEMENTACAO_PROGRESSO.md) |
| Notas Futuras — i18n de Questões & Checklist Personalizável | [ESPECIFICACAO_I18N_CHECKLIST_PERSONALIZAVEL.md](./Features/ESPECIFICACAO_I18N_CHECKLIST_PERSONALIZAVEL.md) |

### Backend — Especificação e Implantação (V2)

| Tema | Documento |
| ---- | --------- |
| Especificação Funcional (Auth & Sincronização em Nuvem) | [DOCUMENTO_FUNCIONAL_AUTENTICACAO_E_SYNC.md](./Backend/DOCUMENTO_FUNCIONAL_AUTENTICACAO_E_SYNC.md) |
| Especificação Técnica de Implementação (SmartCoreHub + Supabase EF Core) | [DOCUMENTO_IMPLEMENTACAO_BACKEND.md](./Backend/DOCUMENTO_IMPLEMENTACAO_BACKEND.md) |
| Matriz de Progresso e Checklist de Implantação | [DOCUMENTO_PROGRESSO_BACKEND.md](./Backend/DOCUMENTO_PROGRESSO_BACKEND.md) |
| Guia de Variáveis de Ambiente — Azure App Service | [GUIA_VARIAVEIS_APP_SERVICE.md](./Backend/GUIA_VARIAVEIS_APP_SERVICE.md) |
| Visão Geral da Feature no Catálogo de Features | [BACKEND_AUTENTICACAO_E_RESPOSTAS.md](./Features/BACKEND_AUTENTICACAO_E_RESPOSTAS.md) |

### Feature Concluída — Salvamento Automático On-line (`UserKinkCheclists`)

| Tema | Documento |
| ---- | --------- |
| Levantamento Funcional e Técnico (Salvamento On-line 1:1 + UX Unificada) | [LEVANTAMENTO_FUNCIONAL_TECNICO.md](./Features/Feito/SalvamentoOnline/LEVANTAMENTO_FUNCIONAL_TECNICO.md) |
| Plano de Implementação Full-Stack (.NET 10 + Angular 22) | [PLANO_IMPLEMENTACAO.md](./Features/Feito/SalvamentoOnline/PLANO_IMPLEMENTACAO.md) |
| Checklist de Implementação e Progresso (Ondas 0 a 3) | [CHECKLIST_IMPLEMENTACAO_PROGRESSO.md](./Features/Feito/SalvamentoOnline/CHECKLIST_IMPLEMENTACAO_PROGRESSO.md) |

### Frontend — Testes, Cobertura e Code Smells (`docs/Frontend/COVERAGE AND TEST/`)

| Tema | Documento |
| ---- | --------- |
| Cobertura de Testes Frontend (Guia Genérico) | [Diretrizes-Coverage-Frontend-Generico.md](./Frontend/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Frontend-Generico.md) |
| Cobertura e Testes Jest (KinkConsentManager V1) | [Diretrizes-Coverage-Frontend-KinkConsentManager.md](./Frontend/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Frontend-KinkConsentManager.md) |
| Ajuste de Code Smells Frontend (Guia Genérico) | [Diretrizes-CodeSmell-Frontend-Generico.md](./Frontend/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-Frontend-Generico.md) |
| Ajuste de Code Smells (KinkConsentManager UI) | [Diretrizes-CodeSmell-KinkConsentManagerUI.md](./Frontend/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-KinkConsentManagerUI.md) |

### Frontend — Pacotes e Baseline Homologado (`docs/Frontend/UpdatePackages/`)

| Tema | Documento |
| ---- | --------- |
| Atualização de Pacotes Frontend (Guia Genérico) | [GuiaGenericoAtualizacaoPacotesFrontend.md](./Frontend/UpdatePackages/GuiaGenericoAtualizacaoPacotesFrontend.md) |
| Atualização de Pacotes (KinkConsentManager UI) | [GuiaAtualizacaoPacotes-KinkConsentManagerUI.md](./Frontend/UpdatePackages/GuiaAtualizacaoPacotes-KinkConsentManagerUI.md) |
| Conjunto Homologado Frontend (`2026-11-22`) | [2026-11-22-ConjuntoHomologado-Frontend.md](./Frontend/UpdatePackages/2026-11-22-ConjuntoHomologado-Frontend.md) |

### Infraestrutura, Testes, CI/CD e Qualidade (`frontend/`, `ci-cd/` e `.devcontainer/`)

| Recurso | Arquivo |
| ------- | ------- |
| Manifesto npm e Scripts | [frontend/package.json](../frontend/package.json) |
| Guia Angular CLI do Frontend | [frontend/README.md](../frontend/README.md) |
| Configuração Jest 30 + Reporters (JUnit, Cobertura, LCOV, Sonar) | [frontend/jest.config.js](../frontend/jest.config.js) |
| Setup Zoneless + Polyfills `jsdom` | [frontend/src/setup-jest.ts](../frontend/src/setup-jest.ts) |
| Configuração SonarCloud | [frontend/sonar-project.properties](../frontend/sonar-project.properties) |
| Pipelines CI/CD (Azure DevOps, GitHub, GitLab & Scripts — desativados por padrão) | [ci-cd/README.md](../ci-cd/README.md) · [Guia Azure DevOps -> Azure](../ci-cd/azure-devops/GUIA_AZURE_DEVOPS_AZURE.md) · [Guia GitHub -> Azure](../ci-cd/github/GUIA_GITHUB_ACTIONS_AZURE.md) · [Guia Deploy Manual Azure](../ci-cd/manualdeploy/GUIA_PUBLICACAO_MANUAL_AZURE.md) · [azure-pipelines.yml](../ci-cd/azure-devops/azure-pipelines.yml) · [kinkconsentmanager-ci-cd.yml](../ci-cd/github/kinkconsentmanager-ci-cd.yml) |
| Dockerfile Multi-Stage & Nginx CSP | [Dockerfile](../frontend/Dockerfile) · [nginx.conf](../frontend/nginx.conf) |
| Docker Compose (Dev/Local & Prod) | [docker-compose.yml](../frontend/docker-compose.yml) · [dockercompose.prod.yml](../frontend/dockercompose.prod.yml) |
| DevContainers (Frontend + Backend Placeholder) | [.devcontainer/docker-compose.yml](../.devcontainer/docker-compose.yml) |

---

## Execução Local e Containers (URLs e Rotas Atuais)

### Rotas da Aplicação SPA

| Recurso | Caminho / URL | Descrição |
| ------- | ------------- | --------- |
| Painel Inicial (Rota padrão) | `/dashboard` | Seção **Ferramentas** com cartão do Checklist e indicador de progresso salvo |
| Início do Checklist | `/checklist` | Seleção inicial entre os 4 modos de preenchimento + importação JSON em segundo plano |
| Preenchimento do Checklist | `/checklist/fill` | Formulário interativo (*Preenchimento Rápido*, *Guiado*, *Clássico*, *Visão Completa*) protegido por `checklistFillGuard` |
| Prévia e Exportação | `/checklist/export` | 3 seções: escolha de estilo (*Visualização Moderna* ou *Visualização Clássica*) → exportação (**PNG**, **PDF**, **XLSX**, **Imprimir**, **CSV**) → **Backup e Restore** (**JSON Draft**) |
| Healthcheck Nginx (Docker) | `/health` | Resposta `200 OK` de disponibilidade do container frontend |

### Portas por Contexto

| Contexto | Base URL | Como Iniciar (em `frontend/`) |
| -------- | -------- | ----------------------------- |
| Angular Dev Server | `http://localhost:4200` | `npm.cmd start` |
| Docker Compose Local (Nginx) | `http://localhost:8082` | `docker compose up --build` |
| Docker Compose Dev Profile | `http://localhost:4200` | `docker compose --profile dev up` |
| Docker Compose Produção | `http://localhost:80` | `docker compose -f dockercompose.prod.yml up -d --build` |

### Relatórios de Testes e Cobertura Gerados pelo Jest (`npm.cmd run test:coverage`)

- LCOV para Sonar/IDE: `frontend/coverage/lcov.info`
- Sonar Generic Test Execution: `frontend/coverage/sonar/sonar-report.xml`
- JUnit XML (CI/CD): `frontend/coverage/junit/test-results.xml`
- Relatórios HTML: `frontend/coverage/index.html`, `frontend/coverage/html/test-report.html`, `frontend/coverage/jest-stare/index.html` e `frontend/coverage/jest-html-reporters/test-report.html`

---

## Backend & Persistência em Nuvem (V2)

> **Status Atual:** **Fase 1 Implementada (131/131 Testes Aprovados · Aguardando Credenciais Supabase para `database update`)** — Topologia de **4 projetos** (`APIs/` + `Core/` com pastas `Domain/`, `Infrastructure/`, `Service/` + CPM) seguindo `C:\git\SmartCoreHub\backend` com reaproveitamento direto do NuGet [`SmartCoreHub.Core.SDK`](https://www.nuget.org/packages/SmartCoreHub.Core.SDK) (`20261120.2351.0`), **.NET 10**, **EF Core 9 (`Npgsql.EntityFrameworkCore.PostgreSQL` `9.0.4`)** no **Supabase**, isolamento total no schema `kink_consent` (`InitialCreateAuth`), segurança BCrypt (`PasswordHasherFactory`) e JWT `HS512` (`TokenConfigurations`).

O ecossistema do backend divide-se em 3 fases:
1. **Fase 1 (Escopo Imediato):** API de Cadastro e Login do Usuário (`LongEntityBase`, `Email` VO, `ServiceResponse<T>` e `JwtAccessTokenService` via `SmartCoreHub.Core.SDK`), senhas fortes com BCrypt, JWT `HS512` e Refresh Token com rotação + detecção de reúso.
2. **Fase 2 (Próxima):** Persistência do Report (`ChecklistDraft`) em coluna nativa `jsonb` no PostgreSQL (`kink_consent.UserKinkCheclists`, entidade `UserKinkCheclist`).
3. **Fase 3:** Interface frontend Angular 22 (modais de autenticação, interceptor JWT e chave opt-in de Cloud Autosave na tela de preenchimento).

Consulte os guias completos em [`docs/Backend/`](./Backend/):
- [Documento Funcional](./Backend/DOCUMENTO_FUNCIONAL_AUTENTICACAO_E_SYNC.md)
- [Documento de Implementação do Backend](./Backend/DOCUMENTO_IMPLEMENTACAO_BACKEND.md)
- [Documento de Progresso](./Backend/DOCUMENTO_PROGRESSO_BACKEND.md)
- [Especificação da Feature](./Features/BACKEND_AUTENTICACAO_E_RESPOSTAS.md)

---

## Segurança, Privacidade e Governança Git

- **Zero-Knowledge Local (V1):** respostas ficam exclusivamente no navegador ou em arquivos exportados sob controle do usuário; nenhum `[innerHTML]` bruto é utilizado nos templates e o Nginx aplica CSP restrita em produção.
- **Segredos:** nunca registrar senhas, tokens, certificados ou strings de conexão reais em Markdown, JSON ou Docker Compose.
- **Governança Git (`R-GOV-GIT`):** alterações em código ou documentação devem permanecer locais no *working directory* para revisão do desenvolvedor; é proibido executar `git commit`, `git push`, criar/alternar `branch` ou abrir `PR` de forma autônoma.
