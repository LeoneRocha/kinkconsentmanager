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
| Internacionalização | `@ngx-translate/core` `^18.1.0` e `@ngx-translate/http-loader` `^18.1.0` (`pt-BR`, `en-US`) com autodetecção inicial do idioma do navegador (`navigator.languages` / `navigator.language`) no `provideAppInitializer` e verificação `npm.cmd run check:i18n` (**66/66** chaves) |
| Schema, Segurança & Preferências | Schema `checklist-v1.json` (`ISchemaRepository`) + autosave criptografado Web Crypto AES-GCM (`CryptoService`, `ChecklistAutosaveService`, `BrowserStorageRepository`) + `UserPreferencesRepository`, `ThemeService` e `AccessibilityService` |
| Web Workers & Exportação Client-Side | Worker unificado (`core/workers/`) com delay configurável por variável de ambiente (`WORKER_LOADING_DELAY_MS`, padrão `3000ms`): **PNG** (`html-to-image` `^1.11.13`), **PDF** (`pdfmake` `^0.3.15`), **XLSX** OOXML modular (layouts Moderno pastel e Clássico paisagem), **Imprimir** (`window.print()` + `@media print`), **JSON Draft** e **CSV** UTF-8 BOM |
| Camada Genérica CRUD | `ICrudOperations`, `BaseDataService`, `BaseCrudService`, `ICrudRepository`, `BaseCrudRepository`, `API_BASE_URL` |
| Testes & Cobertura | **Jest** `^30.5.2`, `jest-preset-angular` `^17.0.3`, `jest-environment-jsdom` `^30.5.2`, `jsdom` `^28.0.0` |
| Qualidade & Reporters | Prettier `^3.8.1`, SonarCloud (`sonar-project.properties`), `jest-junit`, `jest-sonar`, `jest-stare`, `jest-html-reporter`, `jest-html-reporters` |
| Infraestrutura & Containers | Docker multi-stage ([Dockerfile](../frontend/Dockerfile)), Nginx Alpine com CSP e `/health` ([nginx.conf](../frontend/nginx.conf)), Compose e DevContainers |
| **Backend** | **Coming Soon (Roadmap V2+)** — sem implementação na V1; contrato preparatório genérico documentado |

**Baseline verificado (`v1.2.4` — `2026-11-25`):** **73 arquivos `.spec.ts`** / **300 testes unitários aprovados (100%)**, cobertura global Jest de **91,79% Statements / 91,54% Lines**, builds `build` e `build:prod` limpos, **66/66** chaves i18n sincronizadas e formatação Prettier verificada.

---

## Estrutura desta Pasta (`docs/`)

| Pasta / Arquivo | Conteúdo |
| --------------- | -------- |
| [`PROJECT_GUIDELINES.md`](./PROJECT_GUIDELINES.md) | Diretrizes normativas transversais, padrões 4+1, Jest, Git (`R-GOV-GIT`) e Backend genérico |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Arquitetura em camadas, diagramas Mermaid, fluxos, exemplos e catálogo técnico |
| [`Bueprint.md`](./Bueprint.md) | Blueprint conceitual do produto e visão de roadmap futuro (pós-V1) |
| [`CHANGELOG_MELHORIAS.md`](./CHANGELOG_MELHORIAS.md) | Resumo consolidado das melhorias de UX, layout, fluxo de entrada e conformidade técnica |
| [`Features/`](./Features/) | Levantamento funcional/técnico, plano modular de implementação e checklist da V1 |
| [`Frontend/COVERAGE AND TEST/`](./Frontend/COVERAGE%20AND%20TEST/) | Diretrizes de cobertura Jest/Vitest, metas por camada e saneamento de Code Smells |
| [`Frontend/UpdatePackages/`](./Frontend/UpdatePackages/) | Guias de governança/atualização de pacotes npm e conjunto homologado atual |

---

## Percurso Recomendado de Onboarding

1. Entenda a visão geral do produto e o recorte entre V1 e futuro em [Bueprint.md](./Bueprint.md).
2. Leia as regras obrigatórias em [PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md).
3. Explore as camadas e fluxos do código em [ARCHITECTURE.md](./ARCHITECTURE.md).
4. Revise o escopo e a arquitetura detalhada da V1 em [LEVANTAMENTO_FUNCIONAL_TECNICO.md](./Features/LEVANTAMENTO_FUNCIONAL_TECNICO.md) e [PLANO_IMPLEMENTACAO_FRONTEND.md](./Features/PLANO_IMPLEMENTACAO_FRONTEND.md).
5. Confira os padrões de execução local em [frontend/README.md](../frontend/README.md), [Diretrizes de Cobertura](./Frontend/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Frontend-KinkConsentManager.md) e [Guia de Atualização de Pacotes](./Frontend/UpdatePackages/GuiaAtualizacaoPacotes-KinkConsentManagerUI.md).

---

## Índice Completo de Guias

### Documentos Core & Roadmap

| Tema | Documento |
| ---- | --------- |
| Visão Conceitual e Roadmap Futuro | [Bueprint.md](./Bueprint.md) |
| Arquitetura em Camadas e Decisões Técnicas | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Diretrizes Normativas do Projeto | [PROJECT_GUIDELINES.md](./PROJECT_GUIDELINES.md) |
| Resumo de Alterações e Melhorias Recentes | [CHANGELOG_MELHORIAS.md](./CHANGELOG_MELHORIAS.md) |

### Especificação, Planejamento e Progresso V1

| Tema | Documento |
| ---- | --------- |
| Levantamento Funcional e Técnico (V1 Checklist) | [LEVANTAMENTO_FUNCIONAL_TECNICO.md](./Features/LEVANTAMENTO_FUNCIONAL_TECNICO.md) |
| Plano de Implementação Frontend | [PLANO_IMPLEMENTACAO_FRONTEND.md](./Features/PLANO_IMPLEMENTACAO_FRONTEND.md) |
| Checklist de Implementação, Etapas e Progresso | [CHECKLIST_IMPLEMENTACAO_PROGRESSO.md](./Features/CHECKLIST_IMPLEMENTACAO_PROGRESSO.md) |
| Notas Futuras — i18n de Questões & Checklist Personalizável | [ESPECIFICACAO_I18N_CHECKLIST_PERSONALIZAVEL.md](./Features/ESPECIFICACAO_I18N_CHECKLIST_PERSONALIZAVEL.md) |

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
| Prévia e Exportação | `/checklist/export` | Seleção de estilo (*Visualização Moderna* ou *Visualização Clássica*) + **PNG**, **PDF**, **XLSX**, **Imprimir** (`@media print`), **JSON Draft** e **CSV BOM** |
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

## Backend (Coming Soon)

> **Status Atual:** **Coming Soon (Roadmap V2+)** — Não há backend, banco de dados ou API implementados neste repositório durante a V1.

Apesar de a V1 executar 100% no navegador, a arquitetura frontend já mantém prontos os pontos genéricos de extensão para integração futura:

- **Schema Repository Abstraction:** `ISchemaRepository` e token `SCHEMA_REPOSITORY_TOKEN` (hoje servidos por `StaticJsonSchemaRepository`, substituíveis por provedor HTTP sem alterar a UI).
- **Generic CRUD Layer:** `ICrudOperations`, `PageRequest`, `PageResult<T>`, `API_BASE_URL`, `BaseDataService`, `BaseCrudService`, `BaseCrudRepository` e `createCrudRepositoryToken`.
- **Workspace Container Reservado:** o arquivo [.devcontainer/docker-compose.yml](../.devcontainer/docker-compose.yml) já declara `backend-container` marcado como *Roadmap V2+*, além da definição em [.devcontainer/backend/devcontainer.json](../.devcontainer/backend/devcontainer.json).

---

## Segurança, Privacidade e Governança Git

- **Zero-Knowledge Local (V1):** respostas ficam exclusivamente no navegador ou em arquivos exportados sob controle do usuário; nenhum `[innerHTML]` bruto é utilizado nos templates e o Nginx aplica CSP restrita em produção.
- **Segredos:** nunca registrar senhas, tokens, certificados ou strings de conexão reais em Markdown, JSON ou Docker Compose.
- **Governança Git (`R-GOV-GIT`):** alterações em código ou documentação devem permanecer locais no *working directory* para revisão do desenvolvedor; é proibido executar `git commit`, `git push`, criar/alternar `branch` ou abrir `PR` de forma autônoma.
