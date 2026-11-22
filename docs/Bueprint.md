Perfeito! Todas as 11 decisões arquiteturais estão fechadas. Aqui está o documento final consolidado em **Markdown** (`ARCHITECTURE_BLUEPRINT.md`), pronto para você salvar na raiz do seu repositório e utilizar como especificação mestra de desenvolvimento.

---

```markdown
# Blueprint de Arquitetura e Definição de Requisitos (v1.0)
**Projeto:** Plataforma de Checklists de Limites, Consentimento e Práticas Consensuais (BDSM / D/s)

---

## 1. Visão Geral e Escopo da Versão 1 (MVP)
Construir uma aplicação web moderna, responsiva (*mobile-first*) e 100% *client-side* em **Angular** para preenchimento, visualização e exportação de checklists de práticas e limites consensuais.

### Referências de UX e Domínio
* **KinkSheet (`kinksheet.com`) & BDSM-Limits (`bdsm-limits.com`):** Foco absoluto em privacidade local (nenhum dado íntimo enviado a servidores na v1), categorização limpa e escalas visuais intuitivas.
* **Goctionni KinkList v1 / v2 (`Goctionni/KinkList` & `kinklist-v2`):** Perspectiva **Dual-Role** (*Dar / Aplicar* vs. *Receber / Sentir*) configurável por grupo ou item.
* **AdhesiveCheese KinkList & KinkListBR (`herrkrieg/KinkListBR`):** Terminologia fiel ao contexto brasileiro (PT-BR) combinada com suporte bilíngue imediato (EN-US).

### Escopo Fechado da v1 vs. Roadmap (v2 — *Coming Soon*)
* **Incluído na v1:**
  * Checklist dinâmico orientado a JSON (`schemaVersion`) com suporte a **Dual-Role** (`giving` / `receiving`) e **Papel Único**.
  * Troca de idioma em tempo real (**`pt-BR`** e **`en-US`**) sem perda do estado preenchido.
  * Navegação *mobile-first* via **Accordions** com botão **Next** (passo a passo) + alternância para **View Full** (visão completa).
  * Exportação 100% Client-Side em **PNG** (Full Grid Vertical), **PDF** (Full Grid Vertical), **JSON** (rascunho portátil orientado a IDs) e **CSV** (planilha tabular).
* **Mapeado na UI com Badge/Modal `"Em Breve / Coming Soon"` (v2+):**
  * **Motor de Geração de Contratos D/s** (conversão automática das respostas em cláusulas formais).
  * **Custom Builder** (editor visual para o usuário criar/editar/remover grupos e perguntas).
  * **Gestão de Play Partners e Compartilhamento** (persistência em nuvem, links compartilháveis e *Partner Match/Diff*).
  * **Exportação Nativa em Excel (`.xlsx`)** com abas formatadas e estilos.
  * **Backend API Node.js** (preparado via padrão *Repository/Provider* no Angular).

---

## 2. Stack Tecnológica e Padrões de Projeto

### Frontend (100% Angular na v1)
* **Framework:** Angular (Standalone Components, TypeScript estrito).
* **Biblioteca de UI:** **PrimeNG** (Accordions, RadioButtons, Checkboxes, Tooltips, Modals/Dialogs, ToggleButtons).
* **Separação Estrita de Arquivos:** Todos os componentes devem manter obrigatoriamente arquivos separados (`.component.ts`, `.component.html`, `.component.scss`, `.spec.ts`), sem templates ou estilos inline.
* **Gerenciamento de Estado (Signals + Services Genéricos):**
  * Classe abstrata base **`BaseStateService<T>`** utilizando `signal()` e `computed()` nativos do Angular.
  * **`ChecklistStateService extends BaseStateService<ChecklistState>`**: Gerencia respostas por `itemId`, modo de visualização (`accordion` vs `full`), etapa ativa e progresso.
* **Abstração de Fonte de Dados (Preparação para Node.js):**
  * **`BaseDataService<T>`** e interface **`ISchemaRepository`**: Na v1 utiliza `StaticJsonSchemaRepository` (lendo de `assets/schemas/`). Na v2, basta injetar `HttpApiSchemaRepository` apontando para o servidor Node.js sem alterar os componentes.
* **Internacionalização Híbrida (`I18nService` + `@ngx-translate/core`):**
  * **`I18nService`** encapsula o `@ngx-translate/core` e expõe `Signals` reativos para o idioma ativo (`pt-BR` / `en-US`), resolvendo dinamicamente títulos, descrições e opções a partir dos `IDs` do JSON.

---

## 3. Arquitetura de Dados (JSON Orientado a IDs + i18n)

### 3.1. Estrutura Lógica (`assets/schemas/checklist-v1.json`)
O JSON contém **apenas estrutura lógica e IDs**, sem textos fixos, garantindo independência de idioma e compatibilidade futura com banco de dados:

```json
{
  "schemaVersion": "1.0.0",
  "scales": [
    { "id": "hard_limit", "order": 1, "color": "#D32F2F", "icon": "pi-ban" },
    { "id": "soft_limit", "order": 2, "color": "#F57C00", "icon": "pi-exclamation-triangle" },
    { "id": "curious",    "order": 3, "color": "#FBC02D", "icon": "pi-question-circle" },
    { "id": "enjoy",      "order": 4, "color": "#388E3C", "icon": "pi-check-circle" },
    { "id": "favorite",   "order": 5, "color": "#7B1FA2", "icon": "pi-heart-fill" }
  ],
  "groups": [
    {
      "id": "grp_impact_play",
      "order": 1,
      "defaultDualRole": true,
      "items": [
        {
          "id": "item_spanking_manual",
          "type": "scale_matrix",
          "dualRole": true,
          "scaleRef": "default"
        },
        {
          "id": "item_impact_tools",
          "type": "multiple_choice",
          "dualRole": false,
          "options": ["opt_hand", "opt_paddle", "opt_flogger", "opt_cane"],
          "allowOtherOption": true
        }
      ]
    },
    {
      "id": "grp_safety_health",
      "order": 2,
      "defaultDualRole": false,
      "items": [
        {
          "id": "item_safeword_system",
          "type": "single_choice",
          "options": ["opt_traffic_light", "opt_single_word_gesture"],
          "allowOtherOption": true
        },
        {
          "id": "item_medical_allergies",
          "type": "restricted_text",
          "maxLength": 300
        }
      ]
    }
  ]
}

```

### 3.2. Tipos de Input Suportados pelo Renderizador Dinâmico

1. `scale_matrix`: Matriz de escala de limites/interesse (suporta modo *Dual-Role* `giving`/`receiving` ou papel único).
2. `single_choice`: Escolha única (`p-radioButton`).
3. `multiple_choice`: Múltipla escolha (`p-checkbox`).
4. `allowOtherOption` (flag booleana): Adiciona `[ ] Outro (especifique): [input]` ao final de listas fechadas.
5. `restricted_text`: Campo de texto curto estritamente limitado a dados imprevisíveis (ex.: alergias, medicamentos, safewords específicas).

### 3.3. Arquivos de Tradução (`assets/i18n/pt-BR.json` e `en-US.json`)

Mapeamento direto por `ID`:

```json
{
  "scales": {
    "hard_limit": "Limite Rígido (Hard Limit)",
    "soft_limit": "Limite Flexível (Soft Limit)",
    "curious": "Curiosidade / A testar",
    "enjoy": "Gosto / Autorizado",
    "favorite": "Favorito / Alta preferência"
  },
  "groups": {
    "grp_impact_play": {
      "title": "Impact Play e Percussão",
      "description": "Práticas envolvendo impacto físico consensual."
    }
  },
  "items": {
    "item_spanking_manual": {
      "label": "Spanking Manual (Mãos)",
      "tooltip": "Tapas aplicados com a palma da mão."
    }
  },
  "options": {
    "opt_hand": "Mãos",
    "opt_paddle": "Paddle / Palmatória"
  }
}

```

---

## 4. Fluxo de Navegação e Experiência do Usuário (UX)

### Rotas (Lazy Loading)

* `/checklist` — **Preenchimento Interativo:**
* Barra superior com seletor de idioma (`PT-BR` / `EN-US`), barra de progresso e alternador de visualização (**Modo Guiado Accordion** vs. **View Full**).
* No modo Accordion (padrão mobile), cada categoria abre individualmente com botão **`Próxima Categoria (Next)`** ao final, avançando automaticamente e abrindo o próximo painel.


* `/export` — **Pré-visualização e Exportação:**
* Renderiza a prévia do **Full Grid Vertical** (categorias empilhadas uma abaixo da outra em largura total para legibilidade máxima).
* Botões de ação na v1: **Baixar PNG**, **Baixar PDF**, **Exportar Rascunho JSON**, **Exportar CSV** e **Importar Rascunho JSON**.
* Botão com badge *Coming Soon*: **Exportar Excel (`.xlsx`)**.


* `/contract`, `/custom-builder`, `/partners` — **Rotas / Abas de Roadmap (v2):**
* Visíveis no menu principal com tag **`Em Breve`**, exibindo tela informativa do que será entregue na v2.



---

## 5. Especificação dos Serviços de Exportação (100% Client-Side)

1. **`PngExportService` (`html-to-image` / Canvas):**
* Captura um componente oculto/dedicado de impressão (`FullGridExportComponent`) com largura fixa otimizada (ex.: `1080px` ou `1200px`), layout **vertical em bloco único** por categoria, fontes grandes e contraste alto (evitando textos espremidos em múltiplas colunas).


2. **`PdfExportService` (`pdfmake`):**
* Gera documento PDF estruturado programaticamente a partir do estado do checklist e do idioma ativo, utilizando layout **Full Grid Vertical**, cabeçalho com data/versão do schema, legenda de cores/ícones e tabelas limpas que não quebram linhas no meio de um item.


3. **`JsonDraftService` (Persistência Portátil):**
* Exporta e importa apenas `{ "schemaVersion": "1.0.0", "exportedAt": "ISO-DATE", "answers": { ... } }`, permitindo que o usuário salve seu preenchimento localmente e reabra em qualquer idioma.


4. **`CsvExportService`:**
* Gera arquivo `.csv` (UTF-8 com BOM para abrir corretamente acentos no Excel/LibreOffice) contendo colunas: `Group_ID`, `Category`, `Item_ID`, `Item_Label`, `Giving_Response`, `Receiving_Response`, `Selected_Options`, `Custom_Note`.



---

## 6. Estrutura de Diretórios Sugerida (Angular)

```text
src/
├── app/
│   ├── core/
│   │   ├── models/                 # Interfaces compartilháveis (preparadas para Node.js DTOs)
│   │   │   ├── checklist-schema.model.ts
│   │   │   ├── checklist-answer.model.ts
│   │   │   └── export-config.model.ts
│   │   ├── repositories/           # Padrão Repository (Static JSON na v1 -> HTTP Node na v2)
│   │   │   ├── schema.repository.ts
│   │   │   └── static-json-schema.repository.ts
│   │   └── services/               # Services Genéricos e Core
│   │       ├── base-state.service.ts
│   │       ├── base-data.service.ts
│   │       ├── i18n.service.ts
│   │       └── checklist-state.service.ts
│   ├── shared/
│   │   └── components/             # UI Kit Reutilizável (cada um com .ts, .html, .scss, .spec.ts)
│   │       ├── scale-selector/
│   │       ├── dynamic-question-item/
│   │       ├── coming-soon-badge/
│   │       └── full-grid-preview/
│   ├── features/
│   │   ├── checklist/              # Página de preenchimento (Accordion + Next + View Full)
│   │   ├── export/                 # Página de exportação (PNG, PDF, JSON, CSV + Excel Coming Soon)
│   │   └── roadmap-placeholders/   # Telas "Coming Soon" (Contratos, Custom Builder, Partners)
│   ├── app.routes.ts
│   └── app.config.ts
└── assets/
    ├── schemas/
    │   └── checklist-v1.json
    └── i18n/
        ├── pt-BR.json
        └── en-US.json

```

```

---

Quando quiser começar a implementação, me avise qual parte você quer que eu gere primeiro (por exemplo: o **esqueleto dos Services genéricos + `I18nService`**, o **Schema JSON completo v1 com as traduções `pt-BR`/`en-US`**, ou os **componentes do Checklist com PrimeNG**).

```