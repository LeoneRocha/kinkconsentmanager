# PROJECT_GUIDELINES — KinkConsentManager

Documento normativo de referência para desenvolvedores e agentes de IA do **KinkConsentManager**.
Consolida os padrões técnicos, regras de arquitetura, qualidade e governança aplicáveis à base de código atual (V1 Checklist em `frontend/`) e às diretrizes preparatórias genéricas para a futura evolução do Backend (**Coming Soon**).

**Último alinhamento documental:** `2026-11-25` (Angular 22 zoneless, Angular Material 22.3, Font Awesome 7 SVG + CSS, Popper.js, SweetAlert2, Web Worker unificado em `core/workers/` com XLSX OOXML modular, rotas modulares em `core/routes/`, sistema modular de 3 temas em `core/themes/` com autodetecção `prefers-color-scheme`, autodetecção inicial de idioma do navegador no bootstrap, padronização de botões verde/cinza vs. navegação vazada, acessibilidade audiovisual com `alt`/`title` + leitura por foco, Web Crypto AES-GCM, Jest 30 + `jest-preset-angular` 17 e regra mandatória `R-GOV-GUIDELINES`).

---

## Sumário

1. [Introdução](#1-introdução)
2. [Estrutura do Repositório e Stack de Referência](#2-estrutura-do-repositório-e-stack-de-referência)
3. [Backend (Genérico — Coming Soon)](#3-backend-genérico--coming-soon)
4. [Frontend (Angular 22 + Angular Material 22.3 — Ativo na V1)](#4-frontend-angular-22--angular-material-223--ativo-na-v1)
5. [Testes e Qualidade (Jest 30 + Sonar)](#5-testes-e-qualidade-jest-30--sonar)
6. [Padrões Obrigatórios](#6-padrões-obrigatórios)
7. [Checklist Rápido de Entrega](#7-checklist-rápido-de-entrega)
8. [Fontes Consolidadas](#8-fontes-consolidadas)

---

## 1. Introdução

### 1.1 Objetivo do Documento

Centralizar em um único ponto as regras arquiteturais, convenções de código, padrões de testes e salvaguardas de privacidade/governança do **KinkConsentManager**. Consulte este guia antes de criar ou refatorar componentes, serviços, repositórios, schemas, traduções, testes ou infraestrutura.

### 1.2 Hierarquia de Fontes

Quando houver divergência entre documentos:

1. **Código ativo em [frontend/](../frontend)** — fonte da verdade operacional.
2. **Este guia (`PROJECT_GUIDELINES.md`)** — regras transversais de implementação e qualidade.
3. **Arquitetura e Documentos V1** ([ARCHITECTURE.md](./ARCHITECTURE.md) e guias em [Features/](./Features/)) — contratos e decisões da entrega V1.
4. **Guias Especializados Frontend** em [Frontend/](./Frontend/) — diretrizes operacionais de testes, coverage, Code Smells e atualização de pacotes.
5. **Visão Conceitual e Roadmap Futuro** ([Bueprint.md](./Bueprint.md)) — horizonte de funcionalidades V2+ (fora do escopo da V1).

### 1.3 Princípios Gerais

- **Privacidade Zero-Knowledge (V1):** dados preenchidos pertencem exclusivamente ao navegador do usuário (`localStorage` local ou arquivos exportados manualmente). Nenhum dado de resposta trafega por rede externa na V1.
- **SOLID & Desacoplamento:** manter separação clara entre `models`, `repositories`, `services`, `shared` (*Dumb Components*) e `features` (*Smart Pages*).
- **Idiomas de Código vs. Documentação:**
  - Código, símbolos TypeScript, arquivos e nomes de testes (`describe`/`it`) em **inglês**.
  - Documentação, comentários de contexto não óbvios e cabeçalhos de cenário em testes (`// Cenário:` / `// Objetivo:`) em **português**.
  - Textos exibidos ao usuário **nunca ficam hardcoded** em TypeScript/HTML: vivem exclusivamente em `frontend/src/assets/i18n/{lang}.json`.
- **Segredos e Ambiente:** nunca versionar credenciais, chaves privadas ou strings de conexão reais em código, Markdown ou arquivos Compose/Docker.

### 1.4 Governança de Schemas e Contratos (R-GOV-SCHEMA)

- O arquivo [checklist-v1.json](../frontend/src/assets/schemas/checklist-v1.json) define o contrato estrutural da V1 (`schemaVersion`, escalas, grupos, papéis e itens).
- Toda inclusão, remoção ou renomeação de ID no schema exige atualização simultânea em **todos** os arquivos de tradução (`pt-BR.json`, `en-US.json`) e aprovação automática do teste [schema-integrity.spec.ts](../frontend/src/app/core/models/__tests__/schema-integrity.spec.ts).
- Alterações incompatíveis com rascunhos salvos exigem evolução explícita de `schemaVersion`.

### 1.5 Governança de Controle de Versão e Git (R-GOV-GIT)

- **Proibido** executar `git commit`, `git push`, criar/alternar `branch` ou abrir Pull Requests (PRs) de forma autônoma por assistentes ou automações.
- **Isolamento Local Obrigatório:** todas as alterações permanecem exclusivamente na árvore de trabalho local (*working directory* / *stage*) para revisão, validação de diffs e versionamento pelo desenvolvedor responsável.

### 1.6 Adesão Obrigatória às Diretrizes para Todo Novo Desenvolvimento (`R-GOV-GUIDELINES`)

- **Escopo Universal:** qualquer **novo desenvolvimento, funcionalidade, serviço, utilitário ou criação/refatoração de componente** — seja por desenvolvedor ou agente de IA — **deve obrigatoriamente seguir todas as regras deste `PROJECT_GUIDELINES.md`**.
- **Inconformidade Bloqueante:** componentes ou serviços criados fora do padrão **4+1**, sem `ChangeDetectionStrategy.OnPush`, com imagens sem `alt` descritivo, botões/ícones/textos interativos sem `title` (`[attr.title]`) ou atributos ARIA adequados, com strings visíveis ou atributos de acessibilidade **hardcoded fora de `assets/i18n/{lang}.json`**, sem encapsulamento de terceiros ou sem testes unitários Jest são considerados fora de conformidade e devem ser ajustados antes de concluir a entrega.

---

## 2. Estrutura do Repositório e Stack de Referência

### 2.1 Mapa da Raiz

```text
kinkconsentmanager/
├── .devcontainer/                       # Containers de dev (frontend-container ativo + backend-container reservado V2+)
│   ├── docker-compose.yml
│   ├── frontend/devcontainer.json
│   └── backend/devcontainer.json
├── docs/                                # Documentação técnica, specs V1, testes e atualização de pacotes
│   ├── ARCHITECTURE.md
│   ├── PROJECT_GUIDELINES.md
│   ├── CHANGELOG_MELHORIAS.md
│   ├── README.md
│   ├── Bueprint.md
│   ├── Features/
│   └── Frontend/
├── frontend/                            # SPA Angular 22 + Angular Material 22.3 (V1 Checklist & Export)
│   ├── public/                          # Favicons (silhueta de usuário SVG/ICO/PNG), manifest PWA e og-image.png
│   ├── scripts/                         # Versionamento dinâmico amigável (X.Y.Z + buildDate), injeção de telemetria e delay de worker (worker-loading-config-updater.js) e check-i18n-keys.mjs
│   ├── src/app/core/                    # Models, Repositories, Routes (app-routes.config.ts), Themes (theme-presets.config.ts), Workers (core/workers/ + xlsx/) e Services (State, Autosave, Crypto, I18n, Theme, Accessibility, BackgroundTaskWorker, Notification, SweetAlert, UiFeedbackHost, Telemetry)
│   ├── src/app/layouts/                 # Shell layout desacoplado (AppHeaderComponent, AppFooterComponent, AppAccessibilityOverlayComponent)
│   ├── src/app/shared/                  # Dumb Components 4+1 (scale, question, legend, progress, full-grid, confirm, toast-container, popper-popover, sweet-alert-trigger, popup-host, app-icon, import-loading-overlay) e SchemaTranslatePipe
│   ├── src/app/features/                # Features lazy com *.routes.ts modulares: dashboard (/dashboard), checklist (/checklist + /checklist/fill com guard) e export (/checklist/export)
│   ├── src/environments/                # environment.ts e environment.prod.ts (version + buildDate dinâmicos)
│   ├── src/assets/                      # checklist-v1.json e i18n/{pt-BR,en-US}.json
│   ├── src/setup-jest.ts                # Setup zoneless e polyfills jsdom para Jest 30
│   ├── jest.config.js                   # Configuração Jest + jest-preset-angular + 6 reporters
│   ├── nginx.conf / Dockerfile          # Serving estático seguro com CSP e /health
│   ├── docker-compose.yml               # Prod local (:8082) + profile dev (:4200)
│   ├── dockercompose.prod.yml           # Compose produção (:80)
│   └── sonar-project.properties         # Integração SonarCloud (LCOV + sonar-report.xml)
├── references/                          # Bases de referência analisadas no levantamento inicial
└── backend/                             # [Coming Soon — Roadmap V2+] Diretório futuro, não criado na V1
```

### 2.2 Execução, Portas e Containers

| Contexto | Comando / Arquivo | Porta / Endpoint | Observação |
| -------- | ----------------- | ---------------- | ---------- |
| Angular Dev Server | `npm.cmd start` (`ng serve`) | `http://localhost:4200` | Desenvolvimento local com HMR |
| Docker Prod Local | `docker compose up --build` (`frontend/docker-compose.yml`) | `http://localhost:8082` | Nginx + CSP + `/health` |
| Docker Dev Profile | `docker compose --profile dev up` (`frontend/docker-compose.yml`) | `http://localhost:4200` | Hot reload em container |
| Docker Produção | `docker compose -f dockercompose.prod.yml up -d --build` | `http://localhost:80` | Container prod dedicado |
| Backend (Roadmap) | **Coming Soon** (`.devcontainer/backend/` reservado) | *A definir na V2+* | Ainda não implementado na V1 |

### 2.3 Stack Homologada (Baseline `2026-11-22`)

| Área | Referência |
| ---- | ---------- |
| Angular & CLI | Angular `^22.1.0` (Standalone + Signals + **zoneless**), `@angular/build` / `@angular/cli` `^22.1.2` |
| Linguagem & Reatividade | TypeScript `~6.0.2` (`strict: true`, `strictTemplates: true`), RxJS `~7.8.0` |
| Design System & UI | **Angular Material** `^22.3.0`, `@angular/cdk` `^22.3.0`, **Font Awesome** `^7.0.1` (`fontawesome-free`, `free-solid-svg-icons`, `free-brands-svg-icons`), `@popperjs/core` `^2.11.8`, `sweetalert2`, fonte `Nunito` |
| Telemetria & Monitoramento | `@microsoft/applicationinsights-web` (lazy-loaded via `TelemetryService` / `TelemetryErrorHandler`, Zero-Knowledge: apenas `AppPageViews`, `AppEvents`, `AppMetrics` e exceções sanitizadas, sem respostas/notas) |
| Internacionalização | `@ngx-translate/core` `^18.1.0`, `@ngx-translate/http-loader` `^18.1.0` (`pt-BR`, `en-US`) |
| Exportação & Impressão Client-Side | `html-to-image` `^1.11.13`, `pdfmake` `^0.3.15`, `@types/pdfmake` `^0.3.3`, `@media print` (`window.print()`) |
| Testes & Coverage | **Jest** `^30.5.2`, `jest-preset-angular` `^17.0.3`, `jest-environment-jsdom` `^30.5.2`, `jsdom` `^28.0.0`, `@types/jest` `^30.0.0` |
| Reporters & Qualidade | `jest-junit`, `jest-html-reporter`, `jest-sonar`, `jest-stare`, `jest-html-reporters`, Prettier `^3.8.1`, SonarCloud |
| Runtime Verificado | Node `24.16.0` · npm `11.14.1` · Angular CLI `22.1.2` |
| **Backend** | **Coming Soon (V2+)** — tecnologia, persistência e APIs serão definidos apenas no ciclo V2+. |

### 2.4 Escopo Funcional V1 vs. Roadmap V2+

| Módulo / Recurso | Status | Onde Vive |
| ---------------- | ------ | --------- |
| Seleção Inicial de Modo, Checklist Interativo (Passos, Clássico, Completo, Rápido Inline), Acessibilidade & Tema | **Entregue (V1)** | `frontend/src/app/features/checklist/` |
| Persistência Local Criptografada (Web Crypto AES-GCM), Autosave e i18n (`pt-BR` / `en-US`) | **Entregue (V1)** | `frontend/src/app/core/services/` |
| Exportação & Impressão Client-Side (Prévia Moderna/Clássica, PNG, PDF `pdfmake`, Imprimir `@media print`, JSON import/export, CSV BOM) | **Entregue (V1)** | `frontend/src/app/features/export/` |
| Abstração Genérica CRUD (`BaseDataService`, `BaseCrudService`, `BaseCrudRepository`) | **Entregue (V1)** | `frontend/src/app/core/{repositories,services}/` |
| Backend REST / Persistência Remota / E2E Compartilhamento / Contas | **Coming Soon (V2+)** | Fora do escopo da V1 (ver [Bueprint.md](./Bueprint.md)) |

---

## 3. Backend (Genérico — Coming Soon)

> **Status Atual:** Não há backend neste repositório na V1 (`frontend/` opera de forma autônoma). As diretrizes abaixo definem o contrato mínimo esperado para manter o futuro backend coerente com a infraestrutura já preparada no frontend.

### 3.1 Princípios Arquiteturais Gerais (Para V2+)

- **Separação de Camadas:** isolar claramente camada de apresentação/API (roteamento, autenticação, validação de entrada e serialização), camada de serviço/aplicação (regras de negócio) e camada de repositórios/persistência (acesso a banco ou storage).
- **Agnóstico até Decisão da V2+:** a stack concreta de servidor, banco de dados e autenticação ainda **não foi fixada**; o container `.devcontainer/backend/` existe apenas como placeholder de workspace.
- **Zero-Knowledge & Minimização de Dados:** quando houver armazenamento remoto ou compartilhamento entre participantes, priorizar payloads criptografados no cliente (*end-to-end*), expiração/revogação de links e mínima retenção de metadados.

### 3.2 Alinhamento com os Contratos já Preparados no Frontend

O frontend já expõe contratos genéricos em [crud.model.ts](../frontend/src/app/core/models/crud.model.ts), [base-data.service.ts](../frontend/src/app/core/services/base-data.service.ts), [base-crud.service.ts](../frontend/src/app/core/services/base-crud.service.ts) e [base-crud.repository.ts](../frontend/src/app/core/repositories/base-crud.repository.ts). Ao criar APIs futuras:

- **URL base configurável:** consumir recursos relativos/configuráveis via token `API_BASE_URL` (permitindo proxy reverso no `nginx.conf` em mesmo domínio).
- **Paginação e filtros padronizados:** manter compatibilidade com `PageRequest` (`page`, `pageSize`, `sortBy`, `sortDirection`, filtros por query) e `PageResult<T>` (`items`, `total`, `page`, `pageSize`).
- **Operações CRUD consistentes:** `GET` (coleção/item), `POST` (criação), `PUT`/`PATCH` (atualização total/parcial) e `DELETE` (remoção).

### 3.3 Requisitos Operacionais Mínimos (Quando Criado)

- Endpoints explícitos de saúde/prontidão (ex.: `/health` e `/ready`) sem exposição de dados sensíveis.
- Documentação de contrato (OpenAPI/Swagger ou equivalente) antes da integração com o frontend.
- Cabeçalhos de segurança HTTP, rate limiting e política CORS restritiva alinhada ao Nginx.
- Variáveis sensíveis injetadas exclusivamente via ambiente/secrets (nunca versionadas em `.env`, `compose` ou código).
- Testes automatizados de unidade e integração cobrindo contratos, regras de negócio e persistência.

---

## 4. Frontend (Angular 22 + Angular Material 22.3 — Ativo na V1)

### 4.1 Camada de Dados, Repositórios e Serviços Genéricos

- **Dados Estáticos / Schema (`ISchemaRepository`):** sempre acessar o schema via `SCHEMA_REPOSITORY_TOKEN`, permitindo trocar `StaticJsonSchemaRepository` por outra fonte sem alterar componentes.
- **Operações CRUD Genéricas (Preparado para APIs/Extensões):**
  - Serviços HTTP de recurso devem estender `BaseDataService<T, TId, TCreate, TUpdate>` em vez de duplicar chamadas `HttpClient`, normalização de `API_BASE_URL` ou construção de `HttpParams`.
  - Serviços de domínio com regras pré/pós-operação devem estender `BaseCrudService<T, TId, TCreate, TUpdate>`.
  - Repositórios com cache/invalidação devem estender `BaseCrudRepository<T, TId, TCreate, TUpdate>` e expor tokens tipados com `createCrudRepositoryToken`.
- **Estado Reativo:** novos containers de estado em Signals devem estender `BaseStateService<T>`, expondo somente `Signal` readonly para componentes.
- **Armazenamento Local:** todo acesso a `localStorage`/`sessionStorage` deve passar por serviço dedicado com `try/catch` (`LocalStoragePersistenceService`), prevenindo falhas em ambientes sem storage disponível ou com cota esgotada.

### 4.2 Arquitetura Schema-Driven e Internacionalização (i18n)

- **Separação Obrigatória:** IDs estruturais pertencem ao schema (`checklist-v1.json`); textos legíveis pertencem exclusivamente a `assets/i18n/{lang}.json`.
- **Zero Strings Hardcoded (inclusive em ARIA e Alerts):** **100% dos textos de interface, tooltips, `aria-label`, botões de ação (`OK`, `Confirmar`, `Cancelar`, `Fechar`), títulos de alertas/modais e rótulos de versão** em qualquer componente ou serviço devem ser resolvidos via `SchemaTranslatePipe` (`'chave' | schemaTranslate: 'ui'`) ou `I18nService.translateUi('chave')` com chaves sincronizadas em `pt-BR.json` e `en-US.json`.
- **Resolução Reativa e Validação Automática:** usar `provided` `SchemaTranslatePipe` / `I18nService` e validar paridade com `npm.cmd run check:i18n` antes de concluir qualquer entrega.
- **Zero Perda na Troca de Idioma:** alternar entre `pt-BR` e `en-US` deve re-renderizar rótulos mantendo 100% das respostas e notas preenchidas no `ChecklistStateService`.

### 4.3 Governança Estrita de Componentes (Regra 4+1 e Zero Template Inline)

**Regra mandatória para qualquer componente novo ou refatorado em `frontend/src/app/`:**

1. **Proibido template inline (`template: \`...\``):** todo componente deve usar `templateUrl` externo e folha de estilos `.scss` dedicada (`styleUrl` / `styleUrls`).
2. **Estrutura canônica 4+1 arquivos:**
   ```text
   meu-componente/
   ├── meu-componente.component.ts       # Apenas Signals, inputs/outputs, inject() e orquestração
   ├── meu-componente.component.html     # Template acessível e semântico (zero [innerHTML] bruto)
   ├── meu-componente.component.scss     # Estilos isolados respeitando tokens Material e variáveis CSS `--kcm-*`
   ├── meu-componente.component.spec.ts  # Testes unitários Jest 30 + TestBed zoneless
   └── index.ts                          # Barrel export da pasta do componente
   ```
3. **Detecção de Mudanças:** `changeDetection: ChangeDetectionStrategy.OnPush` obrigatório em 100% dos componentes.
4. **Smart vs. Dumb Components:**
   - Componentes em `src/app/shared/components/` são **100% Dumb**: comunicam-se apenas via `input()` / `input.required()` e `output()`, sem injetar `ChecklistStateService`, `Router` ou repositórios.
   - Smart Pages (`pages/*`) injetam estado/repositórios via `inject()` como propriedades `private readonly`.
5. **Tipagem Estrita (`tsconfig.json`):** respeitar `strict: true`, `strictTemplates: true` e `noPropertyAccessFromIndexSignature: true` (usar acesso por colchetes `dict[key]` em index signatures).

### 4.4 Reatividade, RxJS e Prevenção de Memory Leaks (`typescript:S3800`)

- Preferir Signals (`signal()`, `computed()`, `effect()`) na camada de UI em vez de assinaturas RxJS manuais.
- Quando `.subscribe()` for necessário: usar `take(1)` para chamadas finitas e `takeUntilDestroyed(this.destroyRef)` para streams contínuos (como `TranslateService.onLangChange`).
- Em repositórios com cache (`shareReplay(1)`), limpar a referência em cache dentro de `catchError` antes de relançar o erro, evitando cache permanente de falhas.

### 4.5 Privacidade, Segurança e Exportação Client-Side

- **Zero HTML Dinâmico Bruto:** proibido `[innerHTML]` ou `innerHTML` com entrada do usuário; toda interpolação utiliza `{{ ... }}` nativo do Angular, reforçado pelos headers CSP de [nginx.conf](../frontend/nginx.conf).
- **Links Externos:** todo `<a target="_blank">` deve conter `rel="noopener noreferrer"`.
- **Importação JSON (`JsonDraftService`):** validar sempre com `try/catch`, checagem estrutural de objeto e compatibilidade de `schemaVersion` antes de aplicar estado.
- **Exportação CSV (`CsvExportService`):** prefixar obrigatoriamente `\uFEFF` (UTF-8 BOM) e escapar campos conforme RFC-4180 (aspas dobradas, vírgulas e quebras de linha).
- **Exportadores Pesados Isolados:** `pdfmake` e `vfs_fonts` permanecem em *chunk lazy* via token `PDF_MAKER_LOADER`; `html-to-image` é abstraído por `PNG_RENDERER` (largura padrão `1200px`).

### 4.6 Estrutura de Features e Versões de Stack

```text
src/app/features/{feature}/
├── {feature}.routes.ts
├── index.ts
├── components/              # Componentes da feature (cada um no padrão 4+1)
├── pages/                   # Smart pages roteáveis (padrão 4+1)
├── services/                # Serviços específicos da feature (ex.: exportadores)
└── utils/                   # Helpers puros de domínio/apresentação
```

A referência viva de pacotes e versões é [frontend/package.json](../frontend/package.json), documentada e auditada em [Frontend/UpdatePackages/](./Frontend/UpdatePackages/2026-11-22-ConjuntoHomologado-Frontend.md).

---

## 5. Testes e Qualidade (Jest 30 + Sonar)

### 5.1 Convenções Gerais de Teste Frontend

- **Framework:** **Jest 30** + **`jest-preset-angular` 17** (`setupZonelessTestEnv()` em [src/setup-jest.ts](../frontend/src/setup-jest.ts)) + `jsdom`.
- **Nomenclatura:** `describe` e `it` redigidos em inglês com intenção comportamental clara.
- **Contexto:** comentários `// Cenário:` e `// Objetivo:` em português acima de testes não triviais ou fluxos críticos.
- **Estrutura AAA:** organizar blocos em `// Arrange`, `// Act`, `// Assert`.
- **Isolamento Determinístico:**
  - Zero chamadas HTTP reais: usar `provideHttpClient()` + `provideHttpClientTesting()` com `HttpTestingController`.
  - Sempre restaurar spies ao fim de cada teste (`afterEach(() => jest.restoreAllMocks())`).
  - Usar os `InjectionToken` de teste (`SCHEMA_REPOSITORY_TOKEN`, `PNG_RENDERER`, `PDF_MAKER_LOADER`, `createCrudRepositoryToken`) em vez de monkey-patching global.
  - Em componentes `OnPush` no ambiente zoneless, usar `fixture.componentRef.setInput(...)` e `await fixture.whenStable()`.

### 5.2 Comandos Oficiais de Verificação (Windows PowerShell)

> Em ambientes Windows onde a ExecutionPolicy bloqueia `.ps1`, usar sempre `npm.cmd`, `npx.cmd` e `ng.cmd`.

```powershell
Set-Location "e:\git\kinkconsentmanager\frontend"

# 1. Validação estrita de tipos (app e suíte Jest)
npx.cmd tsc -p tsconfig.app.json --noEmit
npx.cmd tsc -p tsconfig.spec.json --noEmit

# 2. Verificação de formatação Prettier e paridade estática i18n
npx.cmd prettier --check "src/**/*.{ts,html,scss,json}"
npm.cmd run check:i18n

# 3. Execução da suíte Jest completa (CI)
npm.cmd run test:ci

# 4. Execução com cobertura LCOV e relatórios JUnit / Sonar / HTML
npm.cmd run test:coverage

# 5. Execução filtrada por camada ou arquivo durante desenvolvimento
npx.cmd jest src/app/core
npx.cmd jest src/app/shared/components
npx.cmd jest src/app/features/checklist
npx.cmd jest src/app/features/export

# 6. Build de produção e auditoria de dependências de runtime
npm.cmd run build:prod
npm.cmd audit --omit=dev
```

### 5.3 Baseline Verificado (V1 Checklist)

- **Suíte:** `73 passed, 73 total` arquivos `.spec.ts` · `300 passed, 300 total` testes unitários (`0` falhas).
- **Cobertura Global Jest:** Statements **`91,79%`** · Branches **`75,32%`** · Functions **`92,23%`** · Lines **`91,54%`**.
- **Relatórios Sonar:** [sonar-project.properties](../frontend/sonar-project.properties) aponta para `frontend/coverage/lcov.info` e `frontend/coverage/sonar/sonar-report.xml`.
- Detalhes completos em [CHANGELOG_MELHORIAS.md](./CHANGELOG_MELHORIAS.md), [Diretrizes-Coverage-Frontend-KinkConsentManager.md](./Frontend/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Frontend-KinkConsentManager.md) e [Diretrizes-CodeSmell-KinkConsentManagerUI.md](./Frontend/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-KinkConsentManagerUI.md).

### 5.4 Testes Backend (Coming Soon)

Quando o backend for iniciado na V2+, deverá acompanhar testes automatizados equivalentes para regras de domínio, validações de contrato, camada de serviços, repositórios/persistência e endpoints HTTP (sem dependência de rede externa nos testes unitários).

---

## 6. Padrões Obrigatórios

| Área / Camada | Padrão Obrigatório |
| ------------- | ------------------ |
| Adesão Geral | **Todo novo desenvolvimento e criação de componente deve seguir integralmente este `PROJECT_GUIDELINES.md` (`R-GOV-GUIDELINES`)**. |
| Schemas & i18n | Schema estrutural em `checklist-v1.json`; **zero strings hardcoded** (UI/ARIA/alertas apenas em `assets/i18n/{lang}.json`); paridade validada por `check:i18n` e `schema-integrity.spec.ts` (**R-GOV-SCHEMA**). |
| Componentes UI | Padrão **4+1 arquivos**, `ChangeDetectionStrategy.OnPush`, `inject()`, **proibido template inline** (`template:`). |
| Shared Kit | Componentes em `src/app/shared/components/` 100% Dumb (`input()` / `output()`, zero dependência de estado global). |
| Estado | Container imutável via Angular Signals estendendo `BaseStateService<T>`; persistência local protegida por `try/catch`. |
| Repositórios & Serviços | Abstrações `ISchemaRepository`, `BaseCrudRepository`, `BaseDataService` e `BaseCrudService`; evicção de cache em `catchError`. |
| Factories UI (Host -> Factory -> Adapter) | Telas e componentes chamam exclusivamente o Host central (`UiFeedbackHostService` / `<app-popup-host>`) informando `kind` e `provider`; os adaptadores especializados (`Toast`, `SnackBar`, `SweetAlert2`, `Material Dialog`, `Popper.js`) ficam registrados nas Factories (`AlertFactoryService`, `ModalFactoryService`), nunca acoplados diretamente às features. |
| Assinaturas RxJS | `take(1)` em chamadas finitas; `takeUntilDestroyed()` em streams contínuos (`typescript:S3800`). |
| Segurança & Privacidade | Zero `[innerHTML]` bruto; CSP em `nginx.conf`; validação de `schemaVersion` no JSON; UTF-8 BOM + escape RFC-4180 no CSV; telemetria Zero-Knowledge (`TelemetryService` nunca envia respostas/notas/rascunhos). |
| Testes Frontend | **Jest 30 + `jest-preset-angular` 17** (zoneless), AAA, `jest.restoreAllMocks()`, `HttpTestingController` para HTTP. |
| Backend | **Coming Soon (Roadmap V2+)** — manter contratos REST/JSON compatíveis com `BaseDataService` / `PageResult<T>` e privacidade E2E. |
| Controle de Versão (Git) | **Proibido `git commit`, `git push`, criação/troca de `branch` ou abertura de `PR` autônomos (R-GOV-GIT)**. |

---

## 7. Checklist Rápido de Entrega

- [ ] Todo novo desenvolvimento ou criação de componente seguiu integralmente este `PROJECT_GUIDELINES.md` (**R-GOV-GUIDELINES**).
- [ ] Alterações no schema preservam compatibilidade ou evoluem `schemaVersion`, mantendo paridade total com `pt-BR.json` e `en-US.json` (**R-GOV-SCHEMA**).
- [ ] Todos os novos componentes seguem o padrão **4+1 arquivos**, usam `OnPush` e não possuem template inline (`template:`).
- [ ] Componentes em `shared/components/` permanecem 100% Dumb (bibliotecas de terceiros como Popper/SweetAlert2/Toast/FontAwesome permanecem encapsuladas).
- [ ] Nenhuma string visível ao usuário ou `aria-label` está hardcoded fora de `assets/i18n/` (`npm.cmd run check:i18n` com `0` pendências).
- [ ] Nenhum `[innerHTML]` inseguro ou vazamento de subscrição RxJS foi introduzido.
- [ ] `npx.cmd tsc -p tsconfig.app.json --noEmit` e `tsconfig.spec.json` passam com `0` erros.
- [ ] `npx.cmd prettier --check "src/**/*.{ts,html,scss,json}"` conclui sem violações.
- [ ] `npm.cmd run test:ci` e `npm.cmd run test:coverage` passam 100% (**73/73 suítes · 300/300 testes**).
- [ ] `npm.cmd run build:prod` conclui sem erros gerando artefatos e assets esperados.
- [ ] `npm.cmd audit --omit=dev` reporta `0` vulnerabilidades em dependências de produção.
- [ ] Configurações `nginx.conf`, `Dockerfile`, `docker-compose*.yml` e `sonar-project.properties` permanecem consistentes.
- [ ] Nenhuma operação de `commit`, `push`, criação/troca de `branch` ou `PR` foi executada automaticamente (**R-GOV-GIT**).

---

## 8. Fontes Consolidadas

| Documento | Contribuição Principal |
| --------- | ---------------------- |
| [README.md](./README.md) | Índice geral, stack atual, URLs e mapa da documentação |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitetura em camadas V1, diagramas, decisões técnicas e Backend Coming Soon |
| [CHANGELOG_MELHORIAS.md](./CHANGELOG_MELHORIAS.md) | Resumo consolidado das melhorias de UX/UI, ícones, impressão e testes |
| [Bueprint.md](./Bueprint.md) | Visão de produto completa, arquitetura Zero-Knowledge e roadmap pós-V1 |
| [LEVANTAMENTO_FUNCIONAL_TECNICO.md](./Features/LEVANTAMENTO_FUNCIONAL_TECNICO.md) | Requisitos funcionais/técnicos e fronteira oficial do escopo V1 Checklist |
| [PLANO_IMPLEMENTACAO_FRONTEND.md](./Features/PLANO_IMPLEMENTACAO_FRONTEND.md) | Plano modular e arquitetura detalhada da entrega V1 Frontend |
| [CHECKLIST_IMPLEMENTACAO_PROGRESSO.md](./Features/CHECKLIST_IMPLEMENTACAO_PROGRESSO.md) | Rastreabilidade de etapas e critérios de aceite da V1 |
| [Diretrizes-CodeSmell-Frontend-Generico.md](./Frontend/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-Frontend-Generico.md) | Guia genérico TypeScript/JS para saneamento de Code Smells e Sonar |
| [Diretrizes-CodeSmell-KinkConsentManagerUI.md](./Frontend/COVERAGE%20AND%20TEST/Diretrizes-CodeSmell-KinkConsentManagerUI.md) | Diretrizes específicas de Code Smells, `OnPush`, 4+1, Sonar e segurança no projeto |
| [Diretrizes-Coverage-Frontend-Generico.md](./Frontend/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Frontend-Generico.md) | Padrões genéricos AAA, mocking e cobertura Jest / Vitest |
| [Diretrizes-Coverage-Frontend-KinkConsentManager.md](./Frontend/COVERAGE%20AND%20TEST/Diretrizes-Coverage-Frontend-KinkConsentManager.md) | Mapa da suíte Jest (evoluída para 41 suítes / 201 testes) e metas de cobertura |
| [GuiaGenericoAtualizacaoPacotesFrontend.md](./Frontend/UpdatePackages/GuiaGenericoAtualizacaoPacotesFrontend.md) | Processo genérico de governança e atualização de pacotes npm |
| [GuiaAtualizacaoPacotes-KinkConsentManagerUI.md](./Frontend/UpdatePackages/GuiaAtualizacaoPacotes-KinkConsentManagerUI.md) | Procedimento operacional de atualização de blocos Angular/Material/Jest no projeto |
| [2026-11-22-ConjuntoHomologado-Frontend.md](./Frontend/UpdatePackages/2026-11-22-ConjuntoHomologado-Frontend.md) | Baseline homologado de versões, build prod, testes Jest e `npm audit` |
| [frontend/README.md](../frontend/README.md) | Guia rápido do pacote Angular CLI e comandos locais |
