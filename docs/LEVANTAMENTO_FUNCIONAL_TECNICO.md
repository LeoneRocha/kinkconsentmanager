# Levantamento Funcional e Técnico
**Projeto:** KinkConsentManager — Plataforma de Checklists de Limites, Consentimento e Práticas Consensuais (BDSM / D/s)  
**Documento:** Levantamento Funcional, Análise Técnica de Referências, Arquitetura Modular e Delimitação Estrita da V1  
**Versão:** 2.0 (Revisão Multi-Agente, TDD & Foco V1)  
**Data:** 21 de Novembro de 2026  

---

## 1. Visão Geral e Delimitação Estrita de Escopo (V1 vs. Backlog Futuro)

O **KinkConsentManager** é uma aplicação web moderna, responsiva (*mobile-first*), acessível (WCAG 2.1 AA) e **100% client-side** em **Angular (Standalone Components) + PrimeNG + Signals**, construída sob arquitetura modular de alta manutenibilidade para preenchimento, visualização e exportação de checklists de práticas e limites consensuais.

### 1.1. Dentro do Escopo da Versão 1 (V1 — Foco 100% Checklist)
A Versão 1 entrega **exclusivamente** o ciclo completo de **Checklist de Consentimento e Limites**, com qualidade de produção, cobertura exaustiva de testes unitários e zero dependências de servidor:

1. **Checklist Dinâmico Orientado a JSON Schema (`checklist-v1.json`):** Renderização puramente orientada a dados e IDs neutros (`schemaVersion`), permitindo atualização de taxonomia sem alteração de código-fonte.
2. **Suporte Parametrizável a Dual-Role e Papel Único:** Configurável por categoria e sobrescrevível por item (`giving`/`receiving`, `dominant`/`submissive`, `self`/`partner` ou papel único `general`).
3. **5 Controles de Resposta Tipados:**
   * `scale_matrix`: Escala visual de 5 níveis de consentimento/limite (com cor + ícone PrimeIcons para acessibilidade).
   * `single_choice`: Escolha única (`p-radioButton`).
   * `multiple_choice`: Múltipla escolha (`p-checkbox`).
   * `allowOtherOption`: Flag booleana que injeta campo `Outro (especifique)` + texto controlado.
   * `restricted_text`: Campo de texto curto com `maxLength` rigoroso (ex.: alergias, safewords, notas médicas).
4. **Internacionalização Bilíngue em Tempo Real (`pt-BR` / `en-US`):** Troca instantânea de idioma via `I18nService` + `@ngx-translate/core`, resolvendo dinamicamente rótulos e tooltips pelos IDs do schema **sem perda das respostas preenchidas**.
5. **Navegação Híbrida Mobile-First:**
   * **Modo Guiado Accordion (padrão mobile):** Uma categoria aberta por vez com botão **`Próxima Categoria (Next)`** ao final para avanço sequencial automático.
   * **Modo Preenchimento Rápido (Quick-Fill Wizard, inspirado no Goctionni):** Modal/overlay focado item a item com prévia dos 3 anteriores/próximos e atalhos numéricos de teclado (`0`–`5` e setas cima/baixo).
   * **Modo View Full:** Alternância imediata para visão completa expandida de todas as categorias.
6. **Persistência Local Segura (Auto-Save):** Salvamento automático contínuo em `localStorage` do navegador (100% privado), com opção explícita de limpar rascunho.
7. **Exportação e Portabilidade 100% Client-Side do Checklist:**
   * **PNG (Full Grid Vertical):** Captura via `html-to-image` em largura fixa legível (1200px) e bloco único vertical.
   * **PDF Estruturado (`pdfmake`):** Documento diagramado com cabeçalho, versão do schema, legenda de cores/ícones e tabelas sem quebra no meio de itens (`dontBreakRows: true`).
   * **JSON Draft Portátil:** Exportação e importação validada do estado `{ schemaVersion, exportedAt, language, answers }`.
   * **CSV Tabular:** Arquivo `.csv` com UTF-8 BOM (`\uFEFF`) compatível com Excel e LibreOffice.

### 1.2. Fora de Escopo na V1 (Backlog Futuro — Decisão Posterior)
Para manter a V1 enxuta, modular, testável e livre de código especulativo ou rotas ociosas no bundle inicial, os itens abaixo ficam **formalmente fora do escopo da V1**, permanecendo documentados apenas para decisão de priorização futura (V2+):

> [!IMPORTANT]
> **Regra de Implementação V1:** Os agentes de desenvolvimento da V1 **NÃO devem criar rotas, telas ou serviços concretos** para os itens abaixo. Apenas os pontos de extensão arquitetural (como `ISchemaRepository` e `ChecklistDraft`) permanecem desacoplados e prontos caso se decida ativá-los no futuro.

| Código | Funcionalidade Futura | Motivo do Adiamento (Pós-V1) | Ponto de Extensão Preservado na V1 |
| :--- | :--- | :--- | :--- |
| **FUT-01** | **Motor de Geração de Contratos D/s** | Requer regras jurídicas/semânticas próprias e revisão de templates fora do núcleo do checklist. | `ChecklistDraft` e `ChecklistSchema` já exportam respostas tipadas por ID. |
| **FUT-02** | **Custom Builder Visual** | Editor drag-and-drop de schemas demanda validação complexa de árvore JSON e UX separada. | Schemas já são carregados dinamicamente via `ISchemaRepository`. |
| **FUT-03** | **Gestão de Play Partners & Partner Match/Diff** | Exige compartilhamento externo, múltiplos perfis simultâneos e algoritmo de comparação. | `ChecklistAnswerState` usa dicionário normalizado por `itemId`. |
| **FUT-04** | **Exportação Nativa Excel (`.xlsx`)** | Bibliotecas como `exceljs`/`xlsx` adicionam peso considerável ao bundle; CSV com BOM cobre planilhas na V1. | Arquitetura de `IExportStrategy` permite plugar novos exportadores isoladamente. |
| **FUT-05** | **Backend API Node.js & Persistência em Nuvem** | V1 prioriza privacidade absoluta client-side (zero servidores). | Padrão Repository (`SCHEMA_REPOSITORY_TOKEN` / `ISchemaRepository`). |
| **FUT-06** | **Integração Descentralizada (ATProto / Bluesky)** | Inspirada no `kinklist.gitlab.io`; fora da necessidade imediata de uso privado local. | `JsonDraftService` provê portabilidade offline equivalente sem conta externa. |
| **FUT-07** | **Rotas/Badges "Coming Soon" na UI** | Evita poluição visual e links mortos na interface final da V1 focada em Checklist. | Controlável futuramente via `FeatureFlags` injetáveis se necessário. |

---

## 2. Análise Técnica Profunda dos Códigos de Referência

Foram inspecionados diretamente os arquivos-fonte das três referências disponíveis em `references/`. Abaixo estão os mecanismos internos observados, suas forças aproveitadas e as falhas estruturais superadas pela nova arquitetura.

### 2.1. Referência 1: AdhesiveCheese (`references/adhesivecheese`)
* **Arquivos inspecionados:** `index.html`, `kinklist.js` (888 linhas), `kinklist.css`, `classic.txt`, `detailed.txt`, `plsno.txt`.
* **Como funciona internamente:**
  * **Formato de dados:** Carrega via AJAX arquivos `.txt` (`classic.txt`, `detailed.txt`, `plsno.txt`) usando sintaxe textual com `#Categoria`, `(Campo1, Campo2)`, `*Item` e `?Descrição`. Descrições geram um botão modal (`showDescriptionButton`) por linha.
  * **Algoritmo de colunas (`createColumns` / `placeCategories`):** Calcula `Math.floor((document.body.scrollWidth - 20) / 400)` (de 1 a 4 colunas). Para distribuir categorias uniformemente, clona cada bloco `.kinkCategory` no `<body>`, mede `height` no DOM e remove o clone antes de empilhar nas colunas.
  * **Serialização de estado (`hashChars`):** Usa alfabeto customizado de 70 caracteres (`a-zA-Z0-9-_.=+*^!@`) com cálculo posicional em potências (`log`, `maxPow`) para comprimir as escolhas no `location.hash`.
  * **Exportação Canvas & Imgur:** Em `export()`, calcula layout de 6 colunas fixas de `250px` (`numCols = 6`, `columnWidth = 250`, `rowHeight = 25`), desenha círculos de `8px` no `CanvasRenderingContext2D` e envia o PNG resultante em Base64 diretamente para a API pública do Imgur (`imgurClientId = '9db53e5936cd02f'`).
* **Lições e Problemas a Evitar:**
  * ❌ **Violação de Privacidade:** Upload automático para Imgur expõe dados íntimos na internet. **Nossa solução:** 100% client-side, download direto sem chamadas externas.
  * ❌ **Medição Imperativa de DOM:** Clonar nós no DOM para medir altura causa *layout thrashing* e falha em telas pequenas. **Nossa solução:** Layout CSS Grid/Flexbox declarativo e *Accordion* mobile-first.
  * ❌ **Acoplamento Total:** Toda a lógica reside em um único objeto global jQuery (`inputKinks`), impossibilitando testes unitários isolados.

### 2.2. Referência 2: Goctionni (`references/Goctionni`)
* **Arquivos inspecionados:** Histórico evolutivo `v0.1.html` até `v1.0.2.html` (1.568 linhas), `v1.html` e `user/Nits_3069.html`.
* **Como funciona internamente:**
  * **Taxonomia Dual-Role Consagrada:** Formalizou os pares de papéis conforme a natureza semântica de cada categoria:
    * `(General)` — preferência global sem polaridade;
    * `(Self, Partner)` — vestimenta, aparência, brinquedos;
    * `(Giving, Receiving)` — atos físicos e estímulos;
    * `(Dominant, Submissive)` — dinâmicas de poder e D/s;
    * `(Aggressor, Target)` — roleplays específicos (ex.: con-non-con).
  * **Escala Visual de 6 Estados:** `Not Entered` (`#FFFFFF`), `Favorite` (`#6DB5FE`), `Like` (`#23FD22`), `Okay` (`#FDFD6B`), `Maybe` (`#DB6C00`), `No` (`#920000`).
  * **Modo Guiado de Preenchimento Rápido (`#InputOverlay` / `inputPopup` via `#StartBtn`):** Recurso valioso que achata todas as combinações `(categoria, campo, item)` via `getAllKinks()`, exibindo o item atual com botões grandes (`.big-choice`), os **3 itens anteriores** (`numPrev: 3`) e **3 próximos** (`numNext: 3`), além de um listener global de teclado (`keydown`) mapeando dígitos `0-5` (`keyCode 48-53` e Numpad `96-101`) e setas cima/baixo (`38/40`) com avanço automático (`showNext()`).
  * **Editor Textual Inline (`#EditOverlay`):** Permite editar a lista em texto e restaurar marcações via seletores CSS gerados por `strToClass`.
* **Lições e Problemas a Evitar:**
  * ✅ **Aprovado e Modernizado:** A estrutura semântica de papéis (`giving`/`receiving`, `dominant`/`submissive`, `self`/`partner`) e o **Modo Guiado Rápido com atalhos de teclado (`0-5` / setas)** serão incorporados como componentes modulares isolados e acessíveis na V1.
  * ❌ **Arquitetura Monolítica:** Todo o HTML, CSS, dados e jQuery residem em um arquivo único de 1.568 linhas, sem separação de responsabilidades, sem i18n e com tabelas horizontais quebradas em smartphones.

### 2.3. Referência 3: Kinklist GitLab.io (`references/kinklist.gitlab.io`)
* **Arquivos inspecionados:** `public/main.tsx` (1.539 linhas), `public/kinks.ts` (225 linhas), `public/parser.ts` (104 linhas), `public/exporter.ts` (253 linhas), `public/base.ts` (21 linhas), `rolldown.config.js`, `package.json`.
* **Como funciona internamente:**
  * **Estado Reativo Granular com Signals:** Utiliza `@preact/signals` com mapa indexado `Map<Kink, Map<string, Signal<Choice>>>` e `getSelectedKinkOrDefault`, evitando re-renderização de toda a página ao clicar em um círculo.
  * **Enum `Choice` com 7 Opções e Textura SVG:** Além das 6 cores tradicionais, adiciona `WantToTry = "want-to-try"` renderizado no Canvas com padrão diagonal hachurado (`SVG` em Base64 convertido para `CanvasPattern`).
  * **DSL Estruturada (`parser.ts`):** Estende a sintaxe `#` / `()` / `*` com o separador `:::` para descrições tanto em categorias quanto em itens (exibidas em tooltips com `@tippyjs/react`).
  * **Serialização Binária + ATProto:** Compacta seleções via `qfs-compression` + `Uint8Array` para Base64 e integra autenticação OAuth com Bluesky/ATProto (`@atcute/lexicons`).
  * **Exportação Canvas Desacoplada (`exporter.ts`):** Separa funções de desenho em `drawCallHandlers` (`simpleTitle`, `titleSubtitle`, `kinkRow`).
* **Lições e Problemas a Evitar:**
  * ✅ **Aprovado e Modernizado:** Uso de **Signals** granulares (nativos do Angular), separação clara de modelos (`base.ts`) e exportadores desacoplados, além de suporte a **descrições/tooltips em categorias e itens** e **identificação visual não dependente apenas de cor** (ícones PrimeIcons + contraste alto).
  * ❌ **Gaps para o Nosso Domínio:** Layout Masonry (`masonic`) dificulta leitura sequencial em negociação de limites (substituído por **Accordion** / **Full Grid Vertical**); ausência de tipos de resposta além da escala de bolinhas (ex.: alergias, safewords, ferramentas preferidas); ausência total de i18n e de testes unitários automatizados.

---

## 3. Requisitos Funcionais da V1 (Escopo Checklist)

| ID | Requisito Funcional | Regras de Negócio & Comportamento Esperado | Prioridade |
| :--- | :--- | :--- | :---: |
| **RF01** | **Carregamento Dinâmico de Schema** | Ler `assets/schemas/checklist-v1.json` via `ISchemaRepository`. Validar presença de `schemaVersion`, `scales` e `groups`. Exibir estado de erro amigável com botão de tentar novamente caso o JSON esteja inválido. | Alta |
| **RF02** | **Suporte a Dual-Role Configurável** | Cada grupo define `defaultDualRole` e `rolePairId` (ex.: `giving_receiving`, `dominant_submissive`, `self_partner`). Itens individuais podem sobrescrever `dualRole` (`true` ou `false`). Quando `true`, renderiza dois seletores independentes; quando `false`, renderiza seletor único. | Alta |
| **RF03** | **Renderização dos 5 Tipos de Entrada** | Renderizar dinamicamente: `scale_matrix` (escala de 5 pontos), `single_choice` (radio buttons), `multiple_choice` (checkboxes), `allowOtherOption` (checkbox + input condicional com `maxLength` padrão 120) e `restricted_text` (textarea/input com contador regressivo até `maxLength`). | Alta |
| **RF04** | **Internacionalização Dinâmica (`pt-BR` / `en-US`)** | Trocar idioma instantaneamente no cabeçalho sem recarregar a página e **preservando 100% das respostas no estado**. Todas as strings de schema são resolvidas via `ID` nos arquivos `assets/i18n/{lang}.json`. | Alta |
| **RF05** | **Navegação Accordion Mobile-First + Next** | Modo padrão em telas `< 768px`. Exibe uma categoria expandida por vez. Ao final do corpo de cada categoria, o botão **`Próxima Categoria`** fecha o painel atual, avança o índice e rola suavemente para o próximo painel. Na última categoria, o botão exibe **`Ir para Exportação`**. | Alta |
| **RF06** | **Alternância para Modo View Full** | Botão segmentado na barra superior permite alternar entre `Accordion Guiado` e `Visão Completa (View Full)` sem perder foco ou respostas. | Média |
| **RF07** | **Modo Quick-Fill Wizard (Atalhos de Teclado)** | Botão opcional "Preenchimento Rápido" abre modal focado item a item (apenas itens `scale_matrix`) permitindo responder com cliques grandes ou teclas `1`–`5` (e `0` para limpar), setas `↑`/`↓` para navegar e avanço automático após seleção. | Média |
| **RF08** | **Progresso em Tempo Real e Filtro Rápido** | Exibir percentual calculado `respondidos / totalItens` e filtro opcional ("Mostrar apenas não respondidos" / "Buscar prática") para facilitar revisões longas. | Média |
| **RF09** | **Persistência Local Automática (Auto-Save)** | Persistir respostas, idioma e modo de visão em `localStorage` com debounce (300ms) e oferecer botão "Limpar Tudo" com diálogo de confirmação (`p-confirmDialog`). | Alta |
| **RF10** | **Prévia e Exportação PNG (Full Grid Vertical)** | Na rota `/export`, renderizar o `FullGridPreviewComponent` em bloco único vertical (1200px no canvas virtual) e baixar arquivo `.png` via `html-to-image` com alta nitidez (`pixelRatio: 2`). | Alta |
| **RF11** | **Exportação PDF Estruturada (`pdfmake`)** | Gerar PDF programático com título, data/hora ISO formatada, versão do schema, legenda de escalas, categorias e tabelas com `dontBreakRows: true` e paginação automática. | Alta |
| **RF12** | **Portabilidade JSON Draft (Exportar & Importar)** | Exportar JSON leve contendo apenas IDs (`{ schemaVersion, exportedAt, language, answers }`). Na importação, validar estrutura e compatibilidade de `schemaVersion`, rejeitar arquivos malformados com feedback claro e restaurar as marcações imediatamente. | Alta |
| **RF13** | **Exportação CSV Tabular (UTF-8 BOM)** | Gerar `.csv` prefixado com `\uFEFF`, com escape RFC-4180 para vírgulas/aspas/quebras de linha e colunas: `Group_ID`, `Category`, `Item_ID`, `Item_Label`, `Role_Mode`, `Giving_Or_Primary_Response`, `Receiving_Or_Secondary_Response`, `Selected_Options`, `Custom_Note`. | Alta |

---

## 4. Requisitos Não-Funcionais (Foco em Modularidade, Manutenibilidade e Testabilidade)

* **RNF01 — Privacidade Absoluta (Zero-Knowledge Client-Side):** Nenhuma resposta do usuário sai do navegador em requisições HTTP na V1. Sem cookies de rastreamento, analytics externos ou uploads automáticos (como o Imgur do AdhesiveCheese).
* **RNF02 — Modularidade e Separação Estrita de Arquivos (Regra dos 4+1 Arquivos):**
  * 100% Standalone Components com `ChangeDetectionStrategy.OnPush`.
  * Proibição estrita de `template` ou `styles` inline. Cada componente possui pasta própria contendo: `.component.ts`, `.component.html`, `.component.scss`, `.component.spec.ts` e `index.ts`.
  * Padrão **Smart vs. Dumb Components**: Componentes em `shared/` não podem importar serviços de estado global nem repositórios.
* **RNF03 — Testabilidade Obrigatória (Spec-Driven):**
  * Todo Service, Repository, Pipe, Guard e Component deve possuir arquivo `.spec.ts` funcional e independente.
  * Metas mínimas de cobertura de código: **>= 90%** para `core/` e `export/services/`, e **>= 85%** para `shared/` e `features/`.
  * Componentes testados isoladamente via Signal Inputs (`fixture.componentRef.setInput(...)`) e mocks leves de dependências.
* **RNF04 — TypeScript Estrito & Qualidade Estática:** `strict: true`, `noImplicitOverride: true`, `noPropertyAccessFromIndexSignature: true`, `strictTemplates: true`. Zero uso de `any`.
* **RNF05 — Acessibilidade (WCAG 2.1 AA):**
  * Nunca depender apenas de cor para transmitir o nível da escala: cada nível combina **cor hexadecimal + ícone PrimeIcons + texto/tooltip**.
  * Uso correto de `role="radiogroup"`, `role="radio"`, `aria-checked`, `aria-label`, navegação por teclado (`Tab`, setas, `Enter`/`Space`) e foco visível.
* **RNF06 — Independência para Execução Paralela Multi-Agente:** Interfaces e DTOs imutáveis em `core/models/` permitem que múltiplos agentes implementem e testem seus módulos simultaneamente sem dependência cruzada de implementação.

---

## 5. Contratos de Dados Oficiais (TypeScript DTOs Compartilhados)

Estes contratos formam a **barreira de integração imutável** entre todas as trilhas de agentes:

```typescript
// src/app/core/models/checklist-schema.model.ts

export type ScaleId = 'hard_limit' | 'soft_limit' | 'curious' | 'enjoy' | 'favorite';

export type QuestionType =
  | 'scale_matrix'
  | 'single_choice'
  | 'multiple_choice'
  | 'restricted_text';

export type RolePairId =
  | 'giving_receiving'
  | 'dominant_submissive'
  | 'self_partner'
  | 'general';

export interface ScaleOption {
  readonly id: ScaleId;
  readonly order: number;
  readonly color: string;        // Ex: '#D32F2F'
  readonly contrastColor: string; // Ex: '#FFFFFF' para texto/ícone acessível
  readonly icon: string;         // Ex: 'pi pi-ban'
}

export interface ItemDefinition {
  readonly id: string;                 // Ex: 'item_spanking_manual'
  readonly type: QuestionType;
  readonly dualRole?: boolean;         // Sobrescreve o defaultDualRole do grupo
  readonly rolePairId?: RolePairId;    // Sobrescreve o rolePairId do grupo
  readonly scaleRef?: string;          // Default: 'default'
  readonly options?: readonly string[]; // IDs das opções (single/multiple)
  readonly allowOtherOption?: boolean; // Adiciona campo "Outro (especifique)"
  readonly maxLength?: number;         // Limite de caracteres (restricted_text / otherText)
}

export interface GroupDefinition {
  readonly id: string;                 // Ex: 'grp_impact_play'
  readonly order: number;
  readonly defaultDualRole: boolean;
  readonly rolePairId: RolePairId;
  readonly items: readonly ItemDefinition[];
}

export interface ChecklistSchema {
  readonly schemaVersion: string;      // SemVer, ex: '1.0.0'
  readonly scales: readonly ScaleOption[];
  readonly groups: readonly GroupDefinition[];
}
```

```typescript
// src/app/core/models/checklist-answer.model.ts

import { ScaleId } from './checklist-schema.model';

export type SupportedLanguage = 'pt-BR' | 'en-US';
export type ChecklistViewMode = 'accordion' | 'full';

export interface ItemResponseValue {
  readonly primaryScale?: ScaleId;       // Papel 1 (Giving / Dominant / Self / General)
  readonly secondaryScale?: ScaleId;     // Papel 2 (Receiving / Submissive / Partner)
  readonly selectedOption?: string;      // Para single_choice (ou '__other__')
  readonly selectedOptions?: readonly string[]; // Para multiple_choice
  readonly otherText?: string;           // Texto livre quando allowOtherOption ativo
  readonly customText?: string;          // Texto curto para restricted_text
}

export interface ChecklistState {
  readonly schemaVersion: string;
  readonly answers: Readonly<Record<string, ItemResponseValue>>;
  readonly viewMode: ChecklistViewMode;
  readonly activeCategoryIndex: number;
  readonly searchQuery: string;
  readonly onlyUnanswered: boolean;
  readonly lastUpdatedAt: string | null;
}

export interface ChecklistDraft {
  readonly schemaVersion: string;
  readonly exportedAt: string;
  readonly language: SupportedLanguage;
  readonly answers: Readonly<Record<string, ItemResponseValue>>;
}

export interface DraftValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly draft?: ChecklistDraft;
}
```

```typescript
// src/app/core/models/export-config.model.ts

export type ExportFormat = 'png' | 'pdf' | 'json' | 'csv';

export interface ExportResult {
  readonly format: ExportFormat;
  readonly filename: string;
  readonly success: boolean;
  readonly errorMessage?: string;
}

export interface FlattenedChecklistRow {
  readonly groupId: string;
  readonly groupTitle: string;
  readonly itemId: string;
  readonly itemLabel: string;
  readonly isDualRole: boolean;
  readonly primaryRoleLabel: string;
  readonly secondaryRoleLabel?: string;
  readonly primaryValueLabel: string;
  readonly secondaryValueLabel?: string;
  readonly primaryColor?: string;
  readonly secondaryColor?: string;
  readonly selectedOptionsLabels: readonly string[];
  readonly customNote: string;
}
```

---

## 6. Taxonomia Base Planejada para `checklist-v1.json`

Consolidando os temas de *AdhesiveCheese* (`classic.txt`/`detailed.txt`), *Goctionni* (`v1.0.2.html`) e *Kinklist.gitlab.io* (`kinks.ts`) adaptados à cena brasileira e internacional:

1. **`grp_safety_health` (`general`, `defaultDualRole: false`):** Sistema de Safewords (`single_choice` + `allowOtherOption`), Protocolo de Aftercare (`multiple_choice` + `allowOtherOption`), Restrições Médicas/Alergias (`restricted_text`, `maxLength: 300`), Limites Psicológicos/Gatilhos (`restricted_text`, `maxLength: 300`).
2. **`grp_affection_general` (`giving_receiving`, `defaultDualRole: true`):** Carinho/Aftercare Físico, Oral, Massagem Sensorial, Teasing/Provocação, Edging, Controle de Ritmo (`scale_matrix`).
3. **`grp_bondage_restraint` (`giving_receiving`, `defaultDualRole: true`):** Algemas/Algemamento Leve, Bondage com Cordas (Shibari/Kinbaku), Venda nos Olhos, Mordaça (`Gag`), Coleira e Guia, Suspensão, Privação Sensorial, Gaiola/Confinamento (`scale_matrix`) + Materiais Preferidos (`multiple_choice` + `allowOtherOption`).
4. **`grp_impact_play` (`giving_receiving`, `defaultDualRole: true`):** Spanking Manual (Mãos), Paddle/Palmatória, Flogger/Chicote de Tiras, Cane/Vara, Crop/Chibata, Tapa no Rosto (`scale_matrix`) + Instrumentos de Impacto (`multiple_choice` + `allowOtherOption`).
5. **`grp_sensation_pain` (`giving_receiving`, `defaultDualRole: true`):** Cera Quente, Gelo, Prendedores/Grampos de Mamilo, Arranhões, Mordidas, Eletroestimulação, Agulhas/Play Piercing (`scale_matrix`).
6. **`grp_domination_power` (`dominant_submissive`, `defaultDualRole: true`):** Dinâmica D/s (24/7 vs. Cena), Serviço Doméstico, Pet Play, Disciplina/Punição Consensual, Controle/Negação de Orgasmo, Humilhação Verbal, Adoração Corporal (`scale_matrix`).
7. **`grp_roleplay_gear` (`self_partner`, `defaultDualRole: true`):** Couro, Látex, Lingerie/Meias, Uniformes/Fantasias, Cross-dressing, Uso de Brinquedos/Plugs/Vibradores (`scale_matrix`).
8. **`grp_breath_edge` (`giving_receiving`, `defaultDualRole: true`):** Controle de Respiração (Breathplay/Choking), Fear Play, Consensual Non-Con (CNC), Sangue/Cutting (`scale_matrix`) — sinalizados com tooltips de alerta de risco (RACK).
