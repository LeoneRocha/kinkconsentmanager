# Blueprint de Arquitetura e Definição de Requisitos (V1 & Roadmap V2+)

**Projeto:** Plataforma de Checklists de Limites, Consentimento e Práticas Consensuais (BDSM / D/s) — **KinkConsentManager**

---

## 1. Visão Geral e Escopo da Versão 1 (MVP)

Aplicação web responsiva (*mobile-first*, largura `100%` em mobile e `90%` em telas médias/grandes) e 100% *client-side* em **Angular 22** (Standalone Components, Signals e execução *zoneless*) para preenchimento, visualização, impressão e exportação de checklists de práticas e limites consensuais com privacidade local criptografada.

### Referências de UX e Domínio
* **KinkSheet (`kinksheet.com`) & BDSM-Limits (`bdsm-limits.com`):** Foco absoluto em privacidade local (nenhum dado íntimo enviado a servidores na V1), categorização limpa e escalas visuais intuitivas.
* **Goctionni KinkList v1 / v2 (`Goctionni/KinkList` & `kinklist-v2`):** Perspectiva **Dual-Role** (*Dar* vs. *Receber*) configurável por grupo ou item e folha compacta em múltiplas colunas (**Modo Clássico**).
* **AdhesiveCheese KinkList & KinkListBR (`herrkrieg/KinkListBR`):** Terminologia fiel ao contexto brasileiro (`pt-BR`) combinada com suporte bilíngue imediato (`en-US`).

### Escopo Entregue na V1 vs. Roadmap (V2+ — *Coming Soon*)
* **Incluído na V1 (Entregue):**
  * Painel Inicial (`/dashboard`) e rotas modulares carregadas sob demanda (`core/routes/app-routes.config.ts`): `/dashboard`, `/checklist`, `/checklist/fill` (com `checklistFillGuard`) e `/checklist/export`.
  * Checklist dinâmico orientado a JSON (`schemaVersion: "1.0.0"`) com **6 opções de escala** (incluindo **`not_applicable` — *Não se aplica***), suporte a **Dual-Role** (*Dar* / *Receber*, *Dominante* / *Submisso(a)*, *Em Mim* / *No(a) Parceiro(a)*) e **Papel Geral**, além de metadados **`participantRoles`** e **`groupId`** já populados em todos os grupos e perguntas para suportar questionários específicos futuros.
  * Autodetecção inicial de idioma do navegador (`navigator.languages` / `navigator.language`) e tema do dispositivo/navegador (`prefers-color-scheme`) via `provideAppInitializer`, com troca de idioma em tempo real (**`pt-BR`** e **`en-US`**), **3 presets fixos de tema** por tokens (`sober` Preto & Branco com azul/degradê, `light` Vermelho e `dark` Vermelho), recursos de acessibilidade audiovisual (leitura automática por foco `(focusin)`, Web Speech API, legendas visuais ao vivo, alto contraste WCAG AAA, tamanho do texto, redução de animações, `alt` e `[attr.title]`) e padronização de botões (verde habilitado / cinza desabilitado em formulários vs. transparente/vazado em navegação e entrada).
  * Tela inicial de entrada (`ChecklistModeSelectorComponent`) para escolher o modo de preenchimento com descrição e guia **Como preencher** ou importar rascunho `.json`.
  * Quatro modos de preenchimento inline ordenados: **1. Preenchimento Rápido** (*Recomendado*, atalhos `1–6`, `0`, `↑/↓`), **2. Guiado (Passos)** (*Por etapas*, trilha circular com validação antes de avançar e Revisão Final), **3. Modo Clássico** (folha tradicional em colunas com círculos) e **4. Visão Completa** (página única).
  * Autosave local criptografado (Web Crypto AES-GCM 256-bit) com chave liga/desliga e botão **Salvar** condicional.
  * Exportação e impressão 100% Client-Side com Web Worker unificado (`core/workers/`, delay configurável por variável de ambiente `WORKER_LOADING_DELAY_MS` padrão `3000ms`) e prévia em 2 etapas (**Visualização Moderna** ou **Visualização Clássica**): **PNG** (`html-to-image`), **PDF** vetorial (`pdfmake`), **XLSX** OOXML modular (Moderno pastel e Clássico paisagem), **Imprimir** (`window.print()` + `@media print`), **JSON** (rascunho portátil export/import) e **CSV** UTF-8 BOM.
* **Roadmap Futuro (V2+ — *Coming Soon*, fora da UI na V1 para evitar poluição visual):**
  * **Questionários Específicos por Perfil (*Role*) e Subcategorias:** seleção inicial de posição (*Top*, *Bottom*, *Switch*, *Dominante*, *Submisso(a)*, *Sádico(a)*, *Masoquista*, *Fetichista*, *Rigger*, *Bunny*, *Outros*) e subcategorias utilizando `participantRoles` e `item.groupId` já estruturados em `checklist-v1.json` (detalhado em [ESPECIFICACAO_I18N_CHECKLIST_PERSONALIZAVEL.md](./Features/ESPECIFICACAO_I18N_CHECKLIST_PERSONALIZAVEL.md)).
  * **Motor de Geração de Contratos D/s** (conversão assistida das respostas em cláusulas formais).
  * **Custom Builder** (editor visual multilíngue para criar/editar/remover grupos, perguntas e traduções próprias).
  * **Gestão de Play Partners e Compartilhamento E2E** (persistência em nuvem zero-knowledge, links temporários e comparação entre perfis).
  * **Backend API** (preparado no frontend via padrão *Repository/Provider* e camada genérica `BaseDataService` / `BaseCrudRepository`).

---

## 2. Stack Tecnológica e Padrões de Projeto

### Frontend (100% Angular na V1)
* **Framework:** Angular 22 (`Standalone Components`, Signals, execução *zoneless*, TypeScript estrito).
* **Biblioteca de UI & Ícones:** **Angular Material 22.3** (`MatButtonModule`, `MatButtonToggleModule`, `MatExpansionModule`, `MatSlideToggleModule`, `MatDialog`, `MatSnackBar`, `MatTooltipModule`, etc.), **Font Awesome Free 7** (`fa-solid`), `sweetalert2`, `@popperjs/core` e tipografia `Nunito`.
* **Separação Estrita de Arquivos:** Todos os componentes seguem a regra **4+1 arquivos** (`.component.ts`, `.component.html`, `.component.scss`, `.component.spec.ts` e `index.ts`) com `ChangeDetectionStrategy.OnPush`, sem templates ou estilos inline.
* **Gerenciamento de Estado (Signals + Services Genéricos):**
  * Classe abstrata base **`BaseStateService<T>`** utilizando `signal()` e `computed()` nativos do Angular.
  * **`ChecklistStateService extends BaseStateService<ChecklistState>`**: Gerencia schema, respostas por `itemId`, validação das 6 escalas, modo de visualização (`quick_fill` | `stepper` | `classic` | `full`), filtros, etapa ativa e progresso.
  * **`ChecklistAutosaveService` + `CryptoService`**: Persistência automática opcional criptografada com AES-GCM 256-bit quando existem alterações não salvas.
  * **`ThemeService` (`core/themes/`)**: Gerencia os 3 presets (`sober`, `light`, `dark`), autodetecção inicial de `prefers-color-scheme` (`addEventListener` + `addListener`) e tokens customizáveis futuros (`THEME_CSS_VAR_MAP`).
  * **`BackgroundTaskWorkerService` (`core/workers/`)**: Orquestra tarefas pesadas em Web Worker (PDF, XLSX Moderno/Clássico, CSV, JSON Draft) com progresso configurável e fallback assíncrono em memória.
* **Abstração de Fonte de Dados (Preparação para V2+):**
  * **`BaseDataService<T>`**, **`BaseCrudRepository`** e interface **`ISchemaRepository`**: Na V1 utiliza `StaticJsonSchemaRepository` (lendo `assets/schemas/checklist-v1.json`) e `StaticJsonQuestionTranslationsRepository`. Em versões futuras, basta injetar um provedor HTTP mantendo a UI intacta.
* **Internacionalização (`I18nService` + `LocaleCatalogService` + `CompositeTranslateLoader`):**
  * **`I18nService`** encapsula `@ngx-translate/core` v18 e `@ngx-translate/http-loader` mesclando `assets/i18n/{lang}.json`, `assets/i18n/groups/{lang}.json` e `assets/i18n/questions/{lang}.json`, detectando o idioma inicial do navegador via `navigator.languages`/`navigator.language` e resolvendo escalas, `roles`, `participantRoles`, grupos, itens e opções pelos IDs do JSON.

---

## 3. Arquitetura de Dados (JSON Orientado a IDs + i18n)

### 3.1. Estrutura Lógica (`frontend/src/assets/schemas/checklist-v1.json`)
O JSON contém **apenas estrutura lógica e IDs**, sem textos fixos, garantindo independência de idioma e compatibilidade futura com filtragem por role/categoria e banco de dados:

```json
{
  "schemaVersion": "1.0.0",
  "participantRoles": ["top", "bottom", "switch", "dominant", "submissive", "sadist", "masochist", "fetishist", "rigger", "bunny", "other"],
  "scales": [
    { "id": "not_applicable", "order": 1, "color": "#546E7A", "contrastColor": "#FFFFFF", "icon": "fa-solid fa-circle-minus" },
    { "id": "hard_limit",     "order": 2, "color": "#D32F2F", "contrastColor": "#FFFFFF", "icon": "fa-solid fa-ban" },
    { "id": "soft_limit",     "order": 3, "color": "#F57C00", "contrastColor": "#111827", "icon": "fa-solid fa-triangle-exclamation" },
    { "id": "curious",        "order": 4, "color": "#FBC02D", "contrastColor": "#111827", "icon": "fa-solid fa-circle-question" },
    { "id": "enjoy",          "order": 5, "color": "#388E3C", "contrastColor": "#FFFFFF", "icon": "fa-solid fa-circle-check" },
    { "id": "favorite",       "order": 6, "color": "#7B1FA2", "contrastColor": "#FFFFFF", "icon": "fa-solid fa-heart" }
  ],
  "groups": [
    {
      "id": "grp_impact_play",
      "order": 4,
      "defaultDualRole": true,
      "rolePairId": "giving_receiving",
      "participantRoles": ["top", "bottom", "switch", "dominant", "submissive", "sadist", "masochist", "other"],
      "items": [
        {
          "id": "item_spanking_manual",
          "groupId": "grp_impact_play",
          "participantRoles": ["top", "bottom", "switch", "dominant", "submissive", "sadist", "masochist", "other"],
          "type": "scale_matrix"
        }
      ]
    }
  ]
}
```

### 3.2. Tipos de Input Suportados pelo Renderizador Dinâmico (`DynamicQuestionItemComponent`)
1. `scale_matrix`: Matriz de escala de limites/interesse com 6 níveis (incluindo *Não se aplica*), suportando modo *Dual-Role* ou papel único.
2. `single_choice`: Escolha única (`mat-radio-group` / `mat-radio-button`).
3. `multiple_choice`: Múltipla escolha (`mat-checkbox`).
4. `allowOtherOption` (flag booleana): Adiciona opção *Outro (especifique)* com campo de texto limitado.
5. `restricted_text`: Campo de texto curto limitado a dados específicos (ex.: alergias, safewords).
6. Ícone informativo (`i`): Exibe descrição da prática em popup modal acessível (`ConfirmDialogComponent`).

---

## 4. Fluxo de Navegação e Experiência do Usuário (UX)

### Rotas (Lazy Loading via `core/routes/app-routes.config.ts`)

* `/dashboard` — **Painel Inicial (Rota Padrão):**
  * `DashboardPageComponent` exibe a seção **Ferramentas** e o cartão inicial do Checklist (com progresso salvo e acesso rápido; retorno direto pelo clique em `.app-shell__brand-title` no topo).

* `/checklist` — **Seleção Inicial de Modo & Importação JSON:**
  * `ChecklistStartPageComponent` + `ChecklistModeSelectorComponent` apresentam os 4 modos ordenados (**Preenchimento Rápido** *Recomendado*, **Guiado (Passos)**, **Modo Clássico** e **Visão Completa**) com descrição e guia **Como preencher**, indicador de progresso salvo localmente e opção de **Importar JSON**.

* `/checklist/fill` — **Preenchimento Interativo (protegido por `checklistFillGuard`):**
  * Cabeçalho (`ChecklistHeaderComponent`), barra de **Progresso**, trilha circular de **Steps** (`ChecklistStepRailComponent`, no modo Guiado) e **Legenda da Escala** permanecem fixos em bloco `sticky` abaixo da topbar enquanto a página rola externamente pelo navegador.
  * **Guiado (Passos)** exige preenchimento completo do passo atual antes de avançar e culmina na **Revisão Final** em accordion.

* `/checklist/export` — **Pré-visualização, Impressão e Exportação (3 Seções):**
  * **Seção 1:** O usuário seleciona entre **Visualização Moderna** (tabelas detalhadas com pílulas coloridas) ou **Visualização Clássica** (folha compacta em colunas com círculos).
  * **Seção 2 — Exporte seu checklist:** liberação em verde dos botões **Baixar PNG**, **Baixar PDF**, **Imprimir**, **Exportar CSV** e **Exportar XLSX**, além do botão **Voltar ao Checklist** vazado.
  * **Seção 3 — Backup e Restore:** botões **Exportar JSON** e **Importar JSON** em área dedicada para backup portátil e restauração do rascunho.

---

## 5. Especificação dos Serviços de Exportação e Impressão (100% Client-Side)

1. **`PngExportService` (`html-to-image`):** Captura superfície dedicada (`1200px` Moderna / `1360px` Clássica) com fallback automático de fontes para maior confiabilidade entre navegadores.
2. **`PdfExportService` (`pdfmake` em Web Worker):** Gera PDF vetorial em *chunk lazy* com cabeçalho (`Checklist`), legenda de escalas e tabelas não quebráveis entre páginas.
3. **`XlsxExportService` (`core/workers/xlsx/` OOXML nativo em Web Worker):** Gera planilha `.xlsx` com processadores independentes para **Visualização Moderna** (tons pastel claros e texto preto em negrito) e **Visualização Clássica** (folha em paisagem 3 colunas com marcadores coloridos `●`/`○`).
4. **Impressão Nativa (`ExportPageComponent.onPrint()` + `@media print`):** Ajusta `document.title` para o padrão `kink-consent-checklist-<modern|classic>-YYYY-MM-DD`, oculta barras e controles e imprime a prévia em fundo branco com preservação de cores.
5. **`JsonDraftService`:** Exporta e valida rascunhos `{ "schemaVersion", "exportedAt", "language", "answers" }` em português ou inglês (suportando processamento em background via `DraftImportWorkerService`).
6. **`CsvExportService`:** Gera `.csv` UTF-8 com BOM (`\uFEFF`) e escape RFC-4180 completo em Web Worker.

---

## 6. Estrutura de Diretórios Atual (`frontend/`)

```text
frontend/
├── public/                               # Ícones (usuário estilizado SVG/ICO/PNG), manifest PWA e og-image.png
└── src/
    ├── app/
    │   ├── core/
    │   │   ├── models/                   # Schema (6 escalas + participantRoles), Answers/ViewMode, ExportConfig, CrudModels e __tests__
    │   │   ├── repositories/             # Schema, QuestionTranslations, BrowserStorage, UserPreferences e BaseCrudRepository
    │   │   ├── routes/                   # APP_ROUTE_SEGMENTS, APP_ROUTE_URLS, APP_ROUTE_COMMANDS, APP_ROUTE_TITLES
    │   │   ├── themes/                   # ThemeColorTokens, THEME_CSS_VAR_MAP, THEME_PRESETS ('sober', 'light', 'dark')
    │   │   ├── workers/                  # background-tasks.worker, pdf, csv, draft-import e xlsx/ (Moderno & Clássico)
    │   │   └── services/                 # BaseState, BaseData, BaseCrud, ChecklistState, Autosave, Crypto, I18n, LocaleCatalog, QuestionTranslations, CompositeTranslateLoader, Theme, Accessibility, BackgroundTaskWorker, Telemetry, Storage
    │   ├── layouts/                      # app-header (marca, menu 3 temas, idioma, a11y), app-footer, app-accessibility-overlay
    │   ├── shared/
    │   │   ├── components/               # app-icon, confirm-dialog, dynamic-question-item, full-grid-preview, import-loading-overlay, legend-bar, popper-popover, popup-host, progress-indicator, scale-selector, sweet-alert-trigger, toast-container
    │   │   └── pipes/                    # SchemaTranslatePipe
    │   ├── features/
    │   │   ├── dashboard/                # dashboard-page (/dashboard)
    │   │   ├── checklist/                # checklist-start-page, checklist-fill.guard, checklist-mode-selector, checklist-header, checklist-progress-bar, checklist-step-rail, checklist-stepper, classic-kink-sheet, full-view-container, quick-fill-wizard-modal, category-accordion
    │   │   └── export/                   # export-page (/checklist/export), export-actions-toolbar, export-backup-restore e serviços (flatten, png, pdf, xlsx, json-draft, csv, file-download)
    │   ├── app.routes.ts
    │   └── app.config.ts
    └── assets/
        ├── schemas/checklist-v1.json
        └── i18n/
            ├── {pt-BR,en-US}.json
            ├── groups/{pt-BR,en-US}.json
            └── questions/{pt-BR,en-US}.json
```
