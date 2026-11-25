# Resumo das Alterações e Melhorias — KinkConsentManager

Documento consolidando todas as alterações funcionais, melhorias de interface (UI/UX), ajustes visuais, exportação/impressão e qualidade implementadas no frontend do **KinkConsentManager**.

> **Documentação relacionada:** [Índice Geral](./README.md) · [Arquitetura](./ARCHITECTURE.md) · [Diretrizes do Projeto](./PROJECT_GUIDELINES.md) · [Blueprint](./Bueprint.md)

---

## 1. Visão Geral da Base Atual (`v1.2.4` — `2026-11-25`)

- **Aplicação:** SPA **100% client-side** em Angular `^22.1.0` (componentes standalone, Signals, `OnPush`, zoneless) com TypeScript `~6.0.2`.
- **Interface & Ícones:** `@angular/material` `^22.3.0`, `@angular/cdk` `^22.3.0`, `@fortawesome/fontawesome-free` `^7.0.1` (`@fortawesome/free-solid-svg-icons`, `@fortawesome/free-brands-svg-icons`), `sweetalert2` `^11.26.25`, `@popperjs/core` `^2.11.8` e fonte arredondada `Nunito`.
- **Temas:** arquitetura modular baseada em tokens (`core/themes/`) com **3 presets fixos** selecionáveis no cabeçalho (**Sóbrio Preto & Branco com azul e degradê**, **Claro Vermelho** e **Escuro Vermelho**), autodetecção inicial do tema do dispositivo/navegador (`prefers-color-scheme`) quando não há escolha salva e base preparada para customização futura pelo usuário.
- **Botões Padronizados:** botões de formulário e ação seguem verde quando habilitados (`--kcm-btn-enabled-*`) e cinza quando desabilitados (`--kcm-btn-disabled-*`) em todos os temas (mudando apenas em Alto Contraste WCAG AAA), enquanto botões de navegação e entrada (*Voltar ao Checklist*, *Começar neste modo →*, *Importar JSON* e *Acessar Checklist →*) adotam estilo transparente e vazado alinhado ao tema ativo.
- **Rotas Modulares:** `/dashboard` (padrão), `/checklist` (escolha de modo), `/checklist/fill` (preenchimento protegido por `checklistFillGuard`) e `/checklist/export` (prévia e exportação).
- **Internacionalização:** `@ngx-translate/core` `^18.1.0` com autodetecção inicial do idioma do navegador (`navigator.languages` / `navigator.language`) no bootstrap (`app.config.ts`) e dicionários simétricos em Português (`pt-BR.json`) e Inglês (`en-US.json`) — **66/66** chaves estáticas de UI sincronizadas via `npm.cmd run check:i18n`.
- **Web Workers, Exportação & Impressão:** Web Worker unificado em `core/workers/` (`pdfmake` `^0.3.15` vetorial, **XLSX OOXML nativo** com layouts Moderno e Clássico desacoplados, **CSV** RFC-4180 + BOM e validação de rascunho **JSON Draft**), além de `html-to-image` `^1.11.13` (PNG), modo nativo de impressão (`window.print()` + `@media print`) e delay configurável por variável de ambiente (`WORKER_LOADING_DELAY_MS`, padrão `3000ms`).
- **Acessibilidade Audiovisual:** `AccessibilityService` (leitura por foco `(focusin)` + Web Speech API + legendas visuais ao vivo + WCAG AAA), `alt` traduzido em imagens e `[attr.title]` padronizado nos templates HTML.
- **Testes:** Jest `^30.5.2` + `jest-preset-angular` `^17.0.3` + `jsdom` `^28.0.0` — **73 suítes aprovadas (73/73)** e **300 testes aprovados (300/300)**.

---

## 2. Identidade Visual, Ícones, Tema e Responsividade

### 2.1 Reformulação Completa dos Ícones Públicos e da Barra Superior
- Substituído o ícone antigo de engrenagem (e o escudo anterior na barra superior) por uma silhueta estilizada de **usuário com cabeça, ombros, chifres curvados e cauda** nas cores dark/carmesim da marca.
- Arquivos atualizados em [`frontend/public/`](../frontend/public):
  - [`favicon.svg`](../frontend/public/favicon.svg)
  - [`favicon.ico`](../frontend/public/favicon.ico) (multi-resolução 16×16, 32×32 e 48×48)
  - [`favicon-32x32.png`](../frontend/public/favicon-32x32.png) (32×32)
  - [`apple-touch-icon.png`](../frontend/public/apple-touch-icon.png) (180×180)
  - [`icon-192.png`](../frontend/public/icon-192.png) (192×192)
  - [`icon-512.png`](../frontend/public/icon-512.png) (512×512)
  - [`og-image.png`](../frontend/public/og-image.png) (1200×630 para Open Graph / compartilhamento)
- Atualizados a meta tag `og:image:alt` em [`index.html`](../frontend/src/index.html) e o emblema superior da aplicação em [`app.component.html`](../frontend/src/app/app.component.html) e [`app.component.scss`](../frontend/src/app/app.component.scss).

### 2.2 Padronização de Título, Espaçamento e Tema Escuro
- **Título contextualizado:** mantido `KinkConsentManager` na barra superior global da aplicação, exibindo **`Checklist`** em `.checklist-header__title` ([`checklist-header.component.ts`](../frontend/src/app/features/checklist/components/checklist-header/checklist-header.component.ts), [`checklist-page.component.ts`](../frontend/src/app/features/checklist/pages/checklist-page/checklist-page.component.ts)) e nas visualizações de prévia, impressão, PNG e PDF ([`i18n.service.ts`](../frontend/src/app/core/services/i18n.service.ts)).
- **Contraste em modo escuro:** textos mantidos em branco e tons neutros claros, reservando o vermelho para bordas, acentos, fundos sutis e indicadores visuais em [`styles.scss`](../frontend/src/styles.scss).
- **Largura responsiva:** área útil configurada para ocupar `100%` em dispositivos móveis (`< 768px`) e `90%` sem `max-width` fixo em telas médias/grandes (`>= 768px`) em [`app.component.scss`](../frontend/src/app/app.component.scss).
- **Espaçamento de componentes Material:** adicionado espaçamento interno consistente entre ícones/rótulos nos botões Material e switches (`mat-mdc-button`, `mat-mdc-slide-toggle`) em [`styles.scss`](../frontend/src/styles.scss).

---

## 3. Experiência Inicial e Modos de Preenchimento (`/checklist`)

### 3.1 Tela Inicial de Escolha do Modo e Importação JSON (`ChecklistModeSelectorComponent`)
- Criado o componente [`ChecklistModeSelectorComponent`](../frontend/src/app/features/checklist/components/checklist-mode-selector/checklist-mode-selector.component.ts) exibido ao acessar `/checklist` antes da abertura direta do formulário:
  - Apresenta os 4 modos de preenchimento ordenados com descrição detalhada e bloco **Como preencher**:
    1. **Preenchimento Rápido** (`quick_fill` — *Recomendado*) — fluxo focado um item por vez com atalhos de teclado (`1–5`, `0`, `↑/↓`).
    2. **Guiado (Passos)** (`stepper` — *Por etapas*) — categoria por vez com trilha visual de etapas, validação de conclusão e Revisão Final.
    3. **Modo Clássico** (`classic`) — folha compacta tradicional em múltiplos blocos com círculos coloridos clicáveis.
    4. **Visão Completa** (`full`) — todas as categorias abertas em uma única página com navegação rápida.
  - **Retomada automática:** quando há respostas salvas localmente (`answeredCount > 0`), exibe um banner com o progresso encontrado e altera o botão para **Continuar neste modo**.
  - **Importação direta na entrada:** card dedicado **Importar JSON** que valida arquivos `.json` via `JsonDraftService`, restaura o rascunho, salva no autosave criptografado e abre o checklist com notificação `MatSnackBar`.

### 3.2 Preenchimento Rápido Inline e Popups de Descrição (`i`)
- O **Preenchimento Rápido** deixou de ser apenas uma modal e passou a operar como modo inline selecionável dentro do checklist ([`ChecklistPageComponent`](../frontend/src/app/features/checklist/pages/checklist-page/checklist-page.component.ts)).
- Ícones informativos (`i`) exibem popup explicativo da prática via `ConfirmDialogComponent` ao serem clicados.

### 3.3 Passo a Passo Circular com Validação e Revisão Final
- Trilha superior reformulada para nós circulares horizontais com anel duplo e conectores no componente [`ChecklistStepRailComponent`](../frontend/src/app/features/checklist/components/checklist-stepper/checklist-step-rail.component.ts) integrado ao [`ChecklistStepperComponent`](../frontend/src/app/features/checklist/components/checklist-stepper/checklist-stepper.component.ts):
  - **Amarelo:** passo atual ativo.
  - **Vermelho + alerta:** tentativa de avançar sem preencher todos os itens do passo atual.
  - **Verde:** passo completamente respondido.
- **Revisão Final** em painéis expansíveis (abertos por padrão) permitindo ajustar qualquer item antes de avançar.

---

## 4. Cabeçalho, Fixação no Topo e Fluxo de Salvamento

### 4.1 Simplificação e Posicionamento no `ChecklistHeaderComponent`
- Removido o campo de busca e consolidados os controles de **modo de visualização**, toggle **Apenas não respondidos** e botão **Limpar tudo** em uma única linha compacta dentro do painel **Visualização, Filtros e Ações** ([`checklist-header.component.html`](../frontend/src/app/features/checklist/components/checklist-header/checklist-header.component.html)).
- Movida a barra de ações (**Salvar**, **Exportar**, toggle **Salvamento automático** e horário do último salvamento criptografado) para logo abaixo do painel de filtros, alinhada à esquerda em linha horizontal a partir de `768px` ([`checklist-header.component.scss`](../frontend/src/app/features/checklist/components/checklist-header/checklist-header.component.scss)).

### 4.2 Estados Condicionais de Salvar e Exportar
- **Botão Salvar:** permanece cinza e desabilitado quando não há alterações pendentes (`!hasUnsavedChanges()`) e fica verde apenas quando existem alterações não salvas; o autosave periódico também só grava quando há alterações pendentes e respeita o toggle **Salvamento automático**.
- **Botões Exportar / Ir para Revisão / Finalizar e Exportar:** permanecem cinza e desabilitados até que 100% dos itens estejam respondidos, ficando verdes quando o checklist é concluído.

### 4.3 Bloco Sticky Unificado com Rolagem Externa do Navegador
- Em telas `>= 768px`, cabeçalho + **Progresso** (+ trilha circular de **Steps** no modo Guiado) + **Legenda da Escala** permanecem fixos em um único contêiner `position: sticky` logo abaixo da barra superior da aplicação, usando a **rolagem externa nativa do navegador** sem criar barras de rolagem internas ([`checklist-page.component.html`](../frontend/src/app/features/checklist/pages/checklist-page/checklist-page.component.html), [`checklist-page.component.scss`](../frontend/src/app/features/checklist/pages/checklist-page/checklist-page.component.scss)).
- A **Legenda da Escala** (`<app-legend-bar>`) foi movida do cabeçalho para logo abaixo da trilha de steps e antes do `role="tabpanel"` em [`checklist-step-rail.component.html`](../frontend/src/app/features/checklist/components/checklist-stepper/checklist-step-rail.component.html) (e abaixo do progresso nos demais modos).

---

## 5. Experiência de Prévia, Exportação e Impressão (`/export`)

### 5.1 Fluxo Guiado em 2 Etapas
- **Etapa 1 — Escolha do estilo:** o usuário escolhe entre **Visualização Moderna** (tabelas detalhadas com pílulas coloridas) ou **Visualização Clássica** (folha compacta com círculos coloridos) em [`export-page.component.html`](../frontend/src/app/features/export/pages/export-page/export-page.component.html).
- **Etapa 2 — Liberação das ações:** os botões de exportação ficam cinza/desabilitados até a escolha do estilo e ficam verdes assim que o resumo é exibido.

### 5.2 Exportações, Impressão e Nomenclatura de Arquivos
- **Novo modo Imprimir (`Imprimir` / `Print`):** adicionado à [`ExportActionsToolbarComponent`](../frontend/src/app/features/export/components/export-actions-toolbar/export-actions-toolbar.component.html) e tratado em [`ExportPageComponent.onPrint()`](../frontend/src/app/features/export/pages/export-page/export-page.component.ts) com regras `@media print` em [`styles.scss`](../frontend/src/styles.scss) e [`export-page.component.scss`](../frontend/src/app/features/export/pages/export-page/export-page.component.scss) (fundo branco, preservação exata de cores e ocultação de barras/botões).
- **Exportação PNG & PDF:** removida a exibição redundante de "Versão do Schema" nas prévias/PDF e ajustada a nomenclatura padrão de arquivos para incluir o layout escolhido:
  `kink-consent-checklist-<modern|classic>-YYYY-MM-DD.<ext>`.

---

## 6. Evoluções Consolidadas Recentes (`v1.2.4` — `2026-11-25`)

### 6.1 Painel Inicial (`/dashboard`) e Arquitetura de Rotas Modulares
- **Registro global e modularização por página:** criado [`app-routes.config.ts`](../frontend/src/app/core/routes/app-routes.config.ts) (`APP_ROUTE_SEGMENTS`, `APP_ROUTE_URLS`, `APP_ROUTE_COMMANDS`, `APP_ROUTE_TITLES`) mantendo zero acoplamento com componentes para preservar 100% do *lazy loading*. Cada rota possui definição modular em seu diretório (`dashboard-page.routes.ts`, `checklist-start-page.routes.ts`, `checklist-page.routes.ts`, `export-page.routes.ts`).
- **Nova rota `/dashboard`:** [`DashboardPageComponent`](../frontend/src/app/features/dashboard/pages/dashboard-page/dashboard-page.component.ts) passou a ser a rota inicial padrão com a seção **Ferramentas** e o cartão inicial do **Checklist** (indicando progresso salvo quando existir).
- **Separação `/checklist` -> `/checklist/fill` -> `/checklist/export`:**
  - `/checklist` exibe a seleção de modo e importação JSON (`ChecklistStartPageComponent`).
  - `/checklist/fill` executa o preenchimento protegido por [`checklistFillGuard`](../frontend/src/app/features/checklist/guards/checklist-fill.guard.ts) (exigindo modo confirmado ou respostas restauradas) e mantém apenas o botão **Voltar ao Checklist**.
  - `/checklist/export` aninhado sob `CHECKLIST_ROUTES` para prévia e exportação.
- **Navegação pelo cabeçalho superior:** removidos os botões redundantes *Voltar ao Dashboard* / *Dashboard* nas páginas do checklist; clicar em `.app-shell__brand-title` ou no bloco `.app-shell__brand` em [`AppHeaderComponent`](../frontend/src/app/layouts/app-header/app-header.component.ts) navega diretamente para `/dashboard` e fecha popovers abertos.

### 6.2 Web Worker Unificado, Exportação XLSX Modular e Atraso Configurável
- **Organização em `core/workers/`:** consolidados todos os processadores e fábrica de worker em [`background-tasks.worker.ts`](../frontend/src/app/core/workers/background-tasks.worker.ts) (`draft-import.processor.ts`, `csv-export.processor.ts`, `pdf-document.builder.ts`, `pdf-export.processor.ts` e submódulos XLSX).
- **Exportação Excel (`.xlsx`) modular e desacoplada (`core/workers/` + `core/workers/xlsx/`):**
  - Dividida entre [`xlsx-export.processor.ts`](../frontend/src/app/core/workers/xlsx-export.processor.ts), escritor OOXML [`ooxml-zip.writer.ts`](../frontend/src/app/core/workers/xlsx/ooxml-zip.writer.ts), construtor de estilos [`xlsx-styles.builder.ts`](../frontend/src/app/core/workers/xlsx/xlsx-styles.builder.ts), serializador de planilha [`xlsx-worksheet.serializer.ts`](../frontend/src/app/core/workers/xlsx/xlsx-worksheet.serializer.ts) e processadores dedicados por layout:
    - [`xlsx-modern-layout.processor.ts`](../frontend/src/app/core/workers/xlsx/xlsx-modern-layout.processor.ts): cores pastel claras para escalas, texto preto em negrito e cabeçalhos sem fundo escuro.
    - [`xlsx-classic-layout.processor.ts`](../frontend/src/app/core/workers/xlsx/xlsx-classic-layout.processor.ts): folha em paisagem com 3 colunas lado a lado espelhando a prévia clássica da tela, usando marcadores `●`/`○` coloridos e zero preenchimento de fundo.
- **Overlay de progresso e delay por variável de ambiente:** [`AppImportLoadingOverlayComponent`](../frontend/src/app/shared/components/import-loading-overlay/import-loading-overlay.component.ts) e [`BackgroundTaskWorkerService`](../frontend/src/app/core/services/background-task-worker.service.ts) com modos de progresso (`virtual`, `synchronized`, `hybrid`), estado concluído verde (`100%` + `fa-check`) e temporização padrão de `3000ms` configurável no build por [`worker-loading-config-updater.js`](../frontend/scripts/worker-loading-config-updater.js) via variáveis `WORKER_LOADING_DELAY_MS`, `WORKER_LOADING_START_DELAY_MS` e `WORKER_LOADING_COMPLETION_DELAY_MS`.

### 6.3 Acessibilidade Audiovisual (`alt`, `title` e Leitura por Foco)
- **Leitura automática por foco:** [`AccessibilityService`](../frontend/src/app/core/services/accessibility.service.ts) ganhou `extractAccessibleText()` (priorizando `aria-label` → `alt` → `title` → `img[alt]` interno → `aria-labelledby` → texto normalizado) e `announceElement()`, integrados a `(focusin)` em [`App`](../frontend/src/app/app.component.ts) quando áudio ou legendas visuais estão ativados (ignorando regiões `aria-live`).
- **`AppIconComponent` acessível:** [`app-icon.component.ts`](../frontend/src/app/shared/components/app-icon/app-icon.component.ts) e [`.html`](../frontend/src/app/shared/components/app-icon/app-icon.component.html) passaram a aceitar `title` com fallback em `ariaLabel`, expondo `[attr.title]`, `role="img"`, `[attr.aria-label]` e elemento `<title>` em SVGs.
- **Cobertura completa nos 31 templates HTML:** substituído `alt=""` do logotipo `favicon.svg` em [`app-header.component.html`](../frontend/src/app/layouts/app-header/app-header.component.html) por `[attr.alt]` e `[attr.title]` traduzidos, e adicionados `[attr.title]` descritivos em botões, links, ícones `<i>`, cartões, abas, inputs, seletores de escala e textos em toda a aplicação.

### 6.4 Sistema Modular de Temas por Tokens e 3 Presets Fixos
- **Catálogo em `core/themes/`:** criados [`theme-preset.model.ts`](../frontend/src/app/core/themes/theme-preset.model.ts) (`ThemeId`, `ThemeColorTokens`, `ThemePresetDefinition`), [`theme-presets.config.ts`](../frontend/src/app/core/themes/theme-presets.config.ts) (`THEME_CSS_VAR_MAP`, `THEME_PRESETS`, `isThemeId`, `getThemePreset`) e [`theme-presets.config.spec.ts`](../frontend/src/app/core/themes/theme-presets.config.spec.ts).
- **Três opções fixas no cabeçalho:**
  1. **Sóbrio (Preto & Branco)** (`sober`): visual preto e branco de alto contraste com detalhes em azul (`#1d4ed8` / `#1e40af`), paleta `mat.$azure-palette` e degradês sutis (`--kcm-accent-gradient`, `--kcm-surface-gradient`).
  2. **Claro (Vermelho)** (`light`): visual claro com acentos em vermelho (`#dc2626`).
  3. **Escuro (Vermelho)** (`dark`): visual escuro acessível com acentos em vermelho (`#dc2626`).
- **Base preparada para customização futura:** [`ThemeService`](../frontend/src/app/core/services/theme.service.ts) e [`UserPreferencesRepository`](../frontend/src/app/core/repositories/user-preferences.repository.ts) suportam `'sober' | 'light' | 'dark'` com `setCustomColorTokens()` / `clearCustomColorTokens()`, respeitando sempre a precedência de `html.app-high-contrast` (WCAG AAA) em [`styles.scss`](../frontend/src/styles.scss).
- **Menu popover de temas:** [`AppHeaderComponent`](../frontend/src/app/layouts/app-header/app-header.component.html) substituído por menu `role="menu"` com amostras visuais dos 3 temas, descrições bilíngues (`pt-BR.json` / `en-US.json`) e anúncios de acessibilidade.

### 6.5 Ordenação dos Modos e Padronização Visual de Botões
- **Nova ordem dos modos de preenchimento:** reordenados em [`ChecklistModeSelectorComponent`](../frontend/src/app/features/checklist/components/checklist-mode-selector/checklist-mode-selector.component.ts), [`ChecklistHeaderComponent`](../frontend/src/app/features/checklist/components/checklist-header/checklist-header.component.ts) e [`ChecklistStartPageComponent`](../frontend/src/app/features/checklist/pages/checklist-start-page/checklist-start-page.component.ts) para **1. Preenchimento Rápido** (`quick_fill`, destacado como **Recomendado**), **2. Guiado (Passos)** (`stepper`, selo *Por etapas*), **3. Modo Clássico** (`classic`) e **4. Visão Completa** (`full`).
- **Padrão verde/cinza nos botões de formulário:** definidos os tokens `--kcm-btn-enabled-*` (verde `#16a34a` / `#15803d`) e `--kcm-btn-disabled-*` (cinza) em [`styles.scss`](../frontend/src/styles.scss) e [`_variables.scss`](../frontend/src/styles/_variables.scss) aplicados de forma uniforme em todos os botões de ação e formulário nos 3 temas (`sober`, `light` e `dark`), adaptando-se exclusivamente em Alto Contraste (`html.app-high-contrast` / `html.app-dark.app-high-contrast`).
- **Botões de navegação e entrada transparentes/vazados:** os botões **Voltar ao Checklist** ([`checklist-page.component.html`](../frontend/src/app/features/checklist/pages/checklist-page/checklist-page.component.html), [`export-actions-toolbar.component.html`](../frontend/src/app/features/export/components/export-actions-toolbar/export-actions-toolbar.component.html)), **Importar JSON** e **Começar neste modo →** ([`checklist-mode-selector.component.scss`](../frontend/src/app/features/checklist/components/checklist-mode-selector/checklist-mode-selector.component.scss)) e **Acessar Checklist →** ([`dashboard-page.component.scss`](../frontend/src/app/features/dashboard/pages/dashboard-page/dashboard-page.component.scss)) utilizam contorno vazado (`transparent`, `--kcm-text-primary`, `--kcm-border-strong` e `:hover` alinhado ao tema ativo).

### 6.6 Autodetecção Inicial de Idioma do Navegador e Tema do Dispositivo
- **Idioma padrão pelo navegador no bootstrap:** removido o `lang: 'pt-BR'` fixo de [`app.config.ts`](../frontend/src/app/app.config.ts) e adicionado `provideAppInitializer` para inicializar [`ThemeService`](../frontend/src/app/core/services/theme.service.ts) e aguardar `I18nService.initialize()` antes da renderização inicial.
- **Lista ordenada de idiomas (`navigator.languages`):** [`LocaleCatalogService.resolveBrowserPreferredLocale()`](../frontend/src/app/core/services/locale-catalog.service.ts) agora inspeciona `navigator.languages` em ordem de preferência (com fallback para `navigator.language`) para escolher `'pt-BR'` ou `'en-US'`, enquanto [`I18nService`](../frontend/src/app/core/services/i18n.service.ts) expõe `isBrowserDefault`, `initialize()` e `clearSavedLanguage()`.
- **Tema inicial pelo dispositivo/navegador:** [`ThemeService`](../frontend/src/app/core/services/theme.service.ts) detecta `(prefers-color-scheme: dark)` no carregamento quando não há tema persistido em `UserPreferencesRepository`, resolve `matchMedia` via `globalThis` / `document.defaultView`, expõe `isSystemDefault` e escuta alterações ao vivo tanto via `addEventListener('change', ...)` quanto via fallback legado `addListener(...)`.

### 6.7 Correção de Template e Verificação Consolidada
- **Saneamento HTML:** removido fragmento duplicado ao final de [`toast-container.component.html`](../frontend/src/app/shared/components/toast-container/toast-container.component.html) que causava falha `NG5002`.

---

## 7. Internacionalização e Verificação de Qualidade

- **Simetria i18n:** **66/66** chaves estáticas de UI sincronizadas entre [`pt-BR.json`](../frontend/src/assets/i18n/pt-BR.json) e [`en-US.json`](../frontend/src/assets/i18n/en-US.json) via `npm.cmd run check:i18n` (`0` ausentes).
- **Validação final executada após as últimas alterações (`2026-11-25`):**
  - `npx.cmd prettier --check`: formatação limpa em todos os arquivos editados.
  - `npm.cmd run build` e `npm.cmd run build:prod`: **concluídos com sucesso (`0` erros e `0` avisos)**.
  - `npm.cmd run test:ci`: **73 suítes aprovadas (73/73)**, **300 testes aprovados (300/300)**, cobertura global de **91,79% Statements / 91,54% Lines / 92,23% Functions / 75,32% Branches**.

---

## 8. Principais Arquivos Criados e Modificados

| Área | Arquivo | Papel |
| ---- | ------- | ----- |
| Bootstrap & Autodetecção | [`app.config.ts`](../frontend/src/app/app.config.ts) / [`i18n.service.ts`](../frontend/src/app/core/services/i18n.service.ts) / [`locale-catalog.service.ts`](../frontend/src/app/core/services/locale-catalog.service.ts) | `provideAppInitializer` para tema/idioma iniciais e detecção automática via `navigator.languages` / `navigator.language` |
| Shell & Acessibilidade | [`app.component.ts`](../frontend/src/app/app.component.ts) / [`.html`](../frontend/src/app/app.component.html) / [`accessibility.service.ts`](../frontend/src/app/core/services/accessibility.service.ts) | Leitor audiovisual por `(focusin)`, `extractAccessibleText()`, legendas ao vivo e skip-link |
| Cabeçalho & Temas UI | [`app-header.component.ts`](../frontend/src/app/layouts/app-header/app-header.component.ts) / [`.html`](../frontend/src/app/layouts/app-header/app-header.component.html) / [`.scss`](../frontend/src/app/layouts/app-header/app-header.component.scss) | Menu de 3 temas, navegação ao `/dashboard` via `.app-shell__brand-title`, `alt` em `favicon.svg` e painel a11y |
| Sistema de Temas | [`theme-presets.config.ts`](../frontend/src/app/core/themes/theme-presets.config.ts) / [`theme.service.ts`](../frontend/src/app/core/services/theme.service.ts) / [`user-preferences.repository.ts`](../frontend/src/app/core/repositories/user-preferences.repository.ts) | Presets `'sober'`, `'light'`, `'dark'`, autodetecção `prefers-color-scheme` (`addEventListener` + `addListener`), CSS vars `--kcm-*` e sobrescrita futura |
| Rotas & Dashboard | [`app-routes.config.ts`](../frontend/src/app/core/routes/app-routes.config.ts) / [`dashboard-page.component.ts`](../frontend/src/app/features/dashboard/pages/dashboard-page/dashboard-page.component.ts) / [`checklist-fill.guard.ts`](../frontend/src/app/features/checklist/guards/checklist-fill.guard.ts) | Rotas modulares (`/dashboard`, `/checklist`, `/checklist/fill`, `/checklist/export`), painel **Ferramentas** e CTA vazado |
| Assets Públicos | [`frontend/public/*`](../frontend/public/favicon.svg) | Ícone SVG, `.ico` multi-res, PNGs e `og-image.png` com silhueta de usuário |
| Entrada & Preenchimento | [`checklist-start-page.component.ts`](../frontend/src/app/features/checklist/pages/checklist-start-page/checklist-start-page.component.ts) / [`checklist-mode-selector.component.ts`](../frontend/src/app/features/checklist/components/checklist-mode-selector/checklist-mode-selector.component.ts) / [`checklist-page.component.ts`](../frontend/src/app/features/checklist/pages/checklist-page/checklist-page.component.ts) | Ordenação dos 4 modos (`Preenchimento Rápido` recomendado primeiro), importação JSON, bloco sticky unificado e botões vazados de navegação |
| Web Workers & XLSX | [`background-tasks.worker.ts`](../frontend/src/app/core/workers/background-tasks.worker.ts) / [`xlsx-modern-layout.processor.ts`](../frontend/src/app/core/workers/xlsx/xlsx-modern-layout.processor.ts) / [`worker-loading-config-updater.js`](../frontend/scripts/worker-loading-config-updater.js) | Processamento em background (PDF, XLSX Moderno/Clássico, CSV, JSON) e delay configurável por env |
| Prévia & Exportação | [`export-page.component.ts`](../frontend/src/app/features/export/pages/export-page/export-page.component.ts) / [`export-actions-toolbar.component.ts`](../frontend/src/app/features/export/components/export-actions-toolbar/export-actions-toolbar.component.ts) | Rota `/checklist/export`, fluxo 2 etapas, PNG/PDF/XLSX/CSV/JSON, **Imprimir** e **Voltar** vazado |
| Estilos Globais | [`styles.scss`](../frontend/src/styles.scss) / [`_variables.scss`](../frontend/src/styles/_variables.scss) | Temas Sóbrio/Claro/Escuro, padrão verde/cinza em botões de formulário, botões de navegação vazados, WCAG AAA e `@media print` |
| Traduções & Auditoria | [`pt-BR.json`](../frontend/src/assets/i18n/pt-BR.json) / [`en-US.json`](../frontend/src/assets/i18n/en-US.json) / [`check-i18n-keys.mjs`](../frontend/scripts/check-i18n-keys.mjs) | Dicionários bilíngues simétricos validados automaticamente |
