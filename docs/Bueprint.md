# Blueprint de Arquitetura e Definição de Requisitos (V1 & Roadmap V2+)

**Projeto:** Plataforma de Checklists de Limites, Consentimento e Práticas Consensuais (BDSM / D/s) — **KinkConsentManager**

---

## 1. Visão Geral e Escopo da Versão 1 (MVP)

Aplicação web responsiva (*mobile-first*, largura `100%` em mobile e `90%` em telas médias/grandes) e 100% *client-side* em **Angular 22** para preenchimento, visualização, impressão e exportação de checklists de práticas e limites consensuais com privacidade local criptografada.

### Referências de UX e Domínio
* **KinkSheet (`kinksheet.com`) & BDSM-Limits (`bdsm-limits.com`):** Foco absoluto em privacidade local (nenhum dado íntimo enviado a servidores na V1), categorização limpa e escalas visuais intuitivas.
* **Goctionni KinkList v1 / v2 (`Goctionni/KinkList` & `kinklist-v2`):** Perspectiva **Dual-Role** (*Dar* vs. *Receber*) configurável por grupo ou item e folha compacta em múltiplas colunas (**Modo Clássico**).
* **AdhesiveCheese KinkList & KinkListBR (`herrkrieg/KinkListBR`):** Terminologia fiel ao contexto brasileiro (`pt-BR`) combinada com suporte bilíngue imediato (`en-US`).

### Escopo Entregue na V1 vs. Roadmap (V2+ — *Coming Soon*)
* **Incluído na V1 (Entregue):**
  * Checklist dinâmico orientado a JSON (`schemaVersion: "1.0.0"`) com suporte a **Dual-Role** (*Dar* / *Receber*, *Dominante* / *Submisso(a)*, *Em Mim* / *No(a) Parceiro(a)*) e **Papel Geral**.
  * Troca de idioma em tempo real (**`pt-BR`** e **`en-US`**), tema claro/escuro e recursos de acessibilidade (leitura em voz alta, legendas visuais ao vivo, alto contraste WCAG AAA, tamanho do texto e redução de animações) sem perda das respostas preenchidas.
  * Tela inicial de entrada (`ChecklistModeSelectorComponent`) para escolher o modo de preenchimento com guia **Como preencher** ou importar rascunho `.json`.
  * Quatro modos de preenchimento inline: **Guiado (Passos)** (trilha circular com validação antes de avançar e Revisão Final), **Modo Clássico** (folha tradicional com círculos), **Visão Completa** (página única) e **Preenchimento Rápido** (fluxo focado com atalhos `1–5`).
  * Autosave local criptografado (Web Crypto AES-GCM 256-bit) com chave liga/desliga e botão **Salvar** condicional.
  * Exportação e impressão 100% Client-Side com prévia em 2 etapas (**Visualização Moderna** ou **Visualização Clássica**): **PNG** (`html-to-image`), **PDF** (`pdfmake`), **Imprimir** (`window.print()` + `@media print`), **JSON** (rascunho portátil export/import) e **CSV** UTF-8 BOM.
* **Roadmap Futuro (V2+ — *Coming Soon*, fora da UI na V1 para evitar poluição visual):**
  * **Motor de Geração de Contratos D/s** (conversão assistida das respostas em cláusulas formais).
  * **Custom Builder** (editor visual para criar/editar/remover grupos e perguntas).
  * **Gestão de Play Partners e Compartilhamento E2E** (persistência em nuvem zero-knowledge, links temporários e comparação entre perfis).
  * **Exportação Nativa em Excel (`.xlsx`)** com abas estilizadas.
  * **Backend API** (preparado no frontend via padrão *Repository/Provider* e camada genérica `BaseDataService` / `BaseCrudRepository`).

---

## 2. Stack Tecnológica e Padrões de Projeto

### Frontend (100% Angular na V1)
* **Framework:** Angular 22 (`Standalone Components`, Signals, execução *zoneless*, TypeScript estrito).
* **Biblioteca de UI & Ícones:** **Angular Material 22.3** (`MatButtonModule`, `MatButtonToggleModule`, `MatExpansionModule`, `MatSlideToggleModule`, `MatDialog`, `MatSnackBar`, `MatTooltipModule`, etc.), **Font Awesome Free 7** (`fa-solid`) e tipografia `Nunito`.
* **Separação Estrita de Arquivos:** Todos os componentes seguem a regra **4+1 arquivos** (`.component.ts`, `.component.html`, `.component.scss`, `.component.spec.ts` e `index.ts`) com `ChangeDetectionStrategy.OnPush`, sem templates ou estilos inline.
* **Gerenciamento de Estado (Signals + Services Genéricos):**
  * Classe abstrata base **`BaseStateService<T>`** utilizando `signal()` e `computed()` nativos do Angular.
  * **`ChecklistStateService extends BaseStateService<ChecklistState>`**: Gerencia schema, respostas por `itemId`, modo de visualização (`stepper` | `classic` | `full` | `quick_fill`), filtros, etapa ativa e progresso.
  * **`ChecklistAutosaveService` + `CryptoService`**: Persistência automática opcional criptografada com AES-GCM 256-bit quando existem alterações não salvas.
* **Abstração de Fonte de Dados (Preparação para V2+):**
  * **`BaseDataService<T>`**, **`BaseCrudRepository`** e interface **`ISchemaRepository`**: Na V1 utiliza `StaticJsonSchemaRepository` (lendo `assets/schemas/checklist-v1.json`). Em versões futuras, basta injetar um provedor HTTP mantendo a UI intacta.
* **Internacionalização (`I18nService` + `@ngx-translate/core`):**
  * **`I18nService`** encapsula `@ngx-translate/core` v18 e expõe Signals reativos para `pt-BR` / `en-US`, resolvendo dinamicamente títulos, descrições e opções a partir dos IDs do JSON.

---

## 3. Arquitetura de Dados (JSON Orientado a IDs + i18n)

### 3.1. Estrutura Lógica (`frontend/src/assets/schemas/checklist-v1.json`)
O JSON contém **apenas estrutura lógica e IDs**, sem textos fixos, garantindo independência de idioma e compatibilidade futura com banco de dados:

```json
{
  "schemaVersion": "1.0.0",
  "scales": [
    { "id": "hard_limit", "order": 1, "color": "#D32F2F", "contrastColor": "#FFFFFF", "icon": "fa-solid fa-ban" },
    { "id": "soft_limit", "order": 2, "color": "#F57C00", "contrastColor": "#111827", "icon": "fa-solid fa-triangle-exclamation" },
    { "id": "curious",    "order": 3, "color": "#FBC02D", "contrastColor": "#111827", "icon": "fa-solid fa-circle-question" },
    { "id": "enjoy",      "order": 4, "color": "#388E3C", "contrastColor": "#FFFFFF", "icon": "fa-solid fa-circle-check" },
    { "id": "favorite",   "order": 5, "color": "#7B1FA2", "contrastColor": "#FFFFFF", "icon": "fa-solid fa-heart" }
  ],
  "groups": [
    {
      "id": "grp_impact_play",
      "order": 1,
      "defaultDualRole": true,
      "rolePairId": "giving_receiving",
      "items": [
        {
          "id": "item_spanking_manual",
          "type": "scale_matrix",
          "dualRole": true
        }
      ]
    }
  ]
}
```

### 3.2. Tipos de Input Suportados pelo Renderizador Dinâmico (`DynamicQuestionItemComponent`)
1. `scale_matrix`: Matriz de escala de limites/interesse (suporta modo *Dual-Role* ou papel único).
2. `single_choice`: Escolha única (`mat-radio-group` / `mat-radio-button`).
3. `multiple_choice`: Múltipla escolha (`mat-checkbox`).
4. `allowOtherOption` (flag booleana): Adiciona opção *Outro (especifique)* com campo de texto limitado.
5. `restricted_text`: Campo de texto curto limitado a dados específicos (ex.: alergias, safewords).
6. Ícone informativo (`i`): Exibe descrição da prática em popup modal acessível (`ConfirmDialogComponent`).

---

## 4. Fluxo de Navegação e Experiência do Usuário (UX)

### Rotas (Lazy Loading)

* `/checklist` — **Seleção de Modo & Preenchimento Interativo:**
  * Ao abrir `/checklist`, `ChecklistModeSelectorComponent` apresenta os 4 modos com descrição e guia **Como preencher**, indicador de progresso salvo localmente e opção de **Importar JSON**.
  * No workspace do checklist, o cabeçalho (`ChecklistHeaderComponent`), barra de **Progresso**, trilha circular de **Steps** (`ChecklistStepRailComponent`, no modo Guiado) e **Legenda da Escala** permanecem fixos em bloco `sticky` abaixo da topbar enquanto a página rola externamente pelo navegador.
  * **Guiado (Passos)** exige preenchimento completo do passo atual antes de avançar e culmina na **Revisão Final** em accordion.

* `/export` — **Pré-visualização, Impressão e Exportação (2 Etapas):**
  * **Etapa 1:** O usuário seleciona entre **Visualização Moderna** (tabelas detalhadas com pílulas coloridas) ou **Visualização Clássica** (folha compacta em colunas com círculos).
  * **Etapa 2:** Liberação em verde dos botões **Baixar PNG**, **Baixar PDF**, **Imprimir**, **Exportar JSON** e **Exportar CSV** (além de **Importar JSON**).

---

## 5. Especificação dos Serviços de Exportação e Impressão (100% Client-Side)

1. **`PngExportService` (`html-to-image`):** Captura superfície dedicada (`1200px` Moderna / `1360px` Clássica) com fallback automático de fontes para maior confiabilidade entre navegadores.
2. **`PdfExportService` (`pdfmake`):** Gera PDF vetorial em *chunk lazy* com cabeçalho (`Checklist`), legenda de escalas e tabelas não quebráveis entre páginas.
3. **Impressão Nativa (`ExportPageComponent.onPrint()` + `@media print`):** Ajusta `document.title` para o padrão `kink-consent-checklist-<modern|classic>-YYYY-MM-DD`, oculta barras e controles e imprime a prévia em fundo branco com preservação de cores.
4. **`JsonDraftService`:** Exporta e valida rascunhos `{ "schemaVersion", "exportedAt", "language", "answers" }` em português ou inglês.
5. **`CsvExportService`:** Gera `.csv` UTF-8 com BOM (`\uFEFF`) e escape RFC-4180 completo.

---

## 6. Estrutura de Diretórios Atual (`frontend/`)

```text
frontend/
├── public/                               # Ícones (usuário estilizado SVG/ICO/PNG), manifest PWA e og-image.png
└── src/
    ├── app/
    │   ├── core/
    │   │   ├── models/                   # Schema, Answers/ViewMode, ExportConfig, CrudModels e __tests__
    │   │   ├── repositories/             # Schema, BrowserStorage, UserPreferences e BaseCrudRepository
    │   │   └── services/                 # BaseState, BaseData, BaseCrud, ChecklistState, Autosave, Crypto, I18n, Theme, Accessibility, Storage
    │   ├── shared/
    │   │   ├── components/               # confirm-dialog, dynamic-question-item, full-grid-preview, legend-bar, progress-indicator, scale-selector
    │   │   └── pipes/                    # SchemaTranslatePipe
    │   ├── features/
    │   │   ├── checklist/                # checklist-mode-selector, checklist-header, checklist-step-rail, checklist-stepper, classic-kink-sheet, full-view-container, quick-fill-wizard-modal, category-accordion
    │   │   └── export/                   # export-page, export-actions-toolbar e serviços (flatten, png, pdf, json-draft, csv, file-download)
    │   ├── app.routes.ts
    │   └── app.config.ts
    └── assets/
        ├── schemas/checklist-v1.json
        └── i18n/{pt-BR,en-US}.json
```
