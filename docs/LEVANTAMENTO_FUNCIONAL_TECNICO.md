# Levantamento Funcional e Técnico
**Projeto:** Plataforma de Gestão de Limites, Consentimento e Práticas Consensuais (BDSM / D/s)  
**Documento:** Levantamento de Requisitos Funcionais, Não-Funcionais e Análise Comparativa de Referências  
**Versão:** 1.0  
**Data:** 21 de Novembro de 2026  

---

## 1. Visão Geral do Produto e Objetivos

O objetivo deste projeto é construir uma aplicação web moderna, responsiva (*mobile-first*), acessível e **100% client-side** (na Versão 1 / MVP) para criação, preenchimento, visualização, auditoria e exportação de **Checklists de Limites e Consentimento em Práticas Consensuais (BDSM / D/s)**.

### 1.1. Contexto de Negócio e Domínio
No contexto das práticas consensuais e relações D/s (Dominação/Submissão), a negociação prévia, a comunicação de limites e a gestão contínua de consentimento são pilares éticos indispensáveis (princípios SSC — *Safe, Sane, Consensual* e RACK — *Risk-Aware Consensual Kink*). 

Historicamente, a comunidade utiliza listas em papel, planilhas ou geradores estáticos na web. Contudo, ferramentas existentes sofrem de problemas crônicos:
* **Falta de Privacidade e Riscos de Vazamento:** Ferramentas que enviam dados para servidores de terceiros ou hospedagens públicas expõem dados ultra-sensíveis e íntimos dos usuários.
* **Incompatibilidade Mobile:** A maioria das listas existentes foi concebida para telas largas de desktop, gerando tabelas horizontais ilegíveis em smartphones.
* **Rigidez e Falta de Suporte a Papéis (Dual-Role):** Muitas práticas possuem aceitação completamente diferente caso a pessoa esteja **aplicando/dando** (*giving*) ou **recebendo/sentindo** (*receiving*). Ferramentas primitivas ignoram essa dualidade ou duplicam itens desnecessariamente.
* **Barreiras Linguísticas e Culturais:** Terminologias em inglês nem sempre possuem tradução direta para o português do Brasil sem perda semântica, exigindo uma camada formal de internacionalização (i18n).

---

## 2. Análise Comparativa Detalhada dos Códigos de Referência

Abaixo é apresentado um raio-X aprofundado das três principais referências de código fornecidas no projeto:

### 2.1. Referência 1: AdhesiveCheese KinkList (`references/adhesivecheese`)
* **Origem e Pilha:** Aplicação legado em HTML5, CSS e jQuery 2.1.4.
* **Estrutura de Dados:**
  * Baseada na leitura de arquivos de texto simples (`classic.txt`, `detailed.txt`, `plsno.txt`).
  * Utiliza sintaxe textual proprietária: linhas iniciadas com `#` denotam categorias, `(` definem papéis/colunas, `*` definem os itens da lista e `?` definem descrições explicativas dos itens.
* **Mecanismos de Interface:**
  * Montagem dinâmica de tabelas HTML via manipulação imperativa de DOM no jQuery.
  * Botões circulares coloridos inline (`.choice`) com opacidade reduzida que aumenta no hover/seleção.
* **Exportação e Persistência:**
  * Geração manual de Canvas 2D desenhando texto e círculos preenchidos pixel a pixel.
  * Integração direta com a API pública do Imgur (`imgurClientId = '9db53e5936cd02f'`) para hospedar a imagem gerada e retornar um link público.
* **Avaliação Crítica:**
  * **Pontos Positivos:** Simplicidade visual do sistema de círculos coloridos; clareza na exibição de categorias temáticas.
  * **Problemas Graves:**
    * *Risco de Privacidade:* O envio automático de imagem para o Imgur quebra totalmente a privacidade de dados íntimos.
    * *Layout Rígido:* Tabelas com muitas colunas extrapolam a largura da tela em celulares, exigindo scroll horizontal incômodo.
    * *Manutenibilidade Ruim:* Manipulação imperativa de DOM e mistura de formatação com dados em arquivos `.txt`.
    * *Sem i18n:* Não há suporte estruturado a múltiplos idiomas.

### 2.2. Referência 2: Goctionni KinkList (`references/Goctionni`)
* **Origem e Pilha:** Desenvolvido entre v0.1 e v1.0.2 (e posterior v2), utilizando arquitetura Single-File HTML monolítico (HTML + CSS incorporado + JavaScript vanilla/jQuery).
* **Estrutura de Dados e Evolução Taxonômica:**
  * Formalizou a distinção fundamental de papéis de participação:
    * `Giving` / `Receiving` (Geral e Práticas Físicas).
    * `Dominant` / `Submissive` (Práticas de Dinâmica de Poder).
    * `Self` / `Partner` (Modificações corporais, vestimentas, acessórios e fetiches estéticos).
    * `General` (Práticas ou preferências universais sem lado ativo/passivo).
* **Mecanismos de Interface:**
  * Tabelas densas de dados com cabeçalhos escuros e linhas zebradas.
  * Legenda no topo associando cada nível da escala a um código de cor:
    * *Favorite* (Azul claro / `#6DB5FE`)
    * *Like / Enjoy* (Verde / `#23FD22`)
    * *Okay / Soft Limit* (Amarelo / `#FDFD6B`)
    * *Maybe / Curious* (Laranja / `#DB6C00`)
    * *No / Hard Limit* (Vermelho / `#920000`)
    * *Not Entered* (Branco/Cinza neutro)
* **Persistência Portátil:**
  * Implementou a codificação do estado das respostas em hash na URL (Query/Hash string compactada), permitindo salvar o preenchimento sem banco de dados.
* **Avaliação Crítica:**
  * **Pontos Positivos:** Introdução impecável do conceito **Dual-Role**, permitindo nuances reais no consentimento; sistema de permalink portátil.
  * **Problemas Graves:**
    * *Arquitetura Não-Modular:* Arquivos HTML com milhares de linhas misturando estilos, scripts e dezenas de tabelas fixas.
    * *Péssima Usabilidade Mobile:* Em celulares, a tabela quebra ou requer zoom e rolagem bidirecional (horizontal e vertical).
    * *Falta de Tipagem e Validação:* Dificuldade extrema para adicionar novas categorias ou validar consistência dos dados.
    * *Sem Suporte Bilíngue Nativo:* Nomes e termos fixos em inglês no markup HTML.

### 2.3. Referência 3: Kinklist GitLab IO (`references/kinklist.gitlab.io`)
* **Origem e Pilha:** Stack contemporânea e sofisticada: TypeScript estrito, Preact, `@preact/signals` para gerenciamento de estado reativo, bundler Rolldown, ecossistema descentralizado ATProto (Bluesky), QFS-Compression e renderizador Masonry (`masonic`).
* **Estrutura de Dados e Parsing:**
  * Módulo formal `parser.ts` com tipagem TypeScript estrita (`KinkCategory`, `Kink`, `Choice`).
  * Sintaxe DSL estendida com separador `:::` para descrições de contexto e tooltips.
* **Mecanismos de Interface:**
  * Gerenciamento de estado reativo atômico: mapa bi-dimensional de Signals `Map<Kink, Map<string, Signal<Choice>>>`.
  * Grid em alvenaria (Masonry) com tooltips interativos acionados via `@tippyjs/react`.
  * Alternância de tema Dark/Light com FontAwesome.
* **Exportação:**
  * Módulo dedicado `exporter.ts` que desenha no Canvas de forma estruturada (`drawCallHandlers` para títulos, subtítulos e linhas com círculos).
  * Inclusão de padrão visual com textura hatch (*diagonal stripes SVG pattern*) para a escolha "Want to try" além de cores sólidas.
* **Avaliação Crítica:**
  * **Pontos Positivos:** Uso elegante de reatividade com Signals; tipagem estrita; empacotamento moderno; exportação Canvas limpa sem chamadas de rede externas.
  * **Limitações a Superar no Nosso Projeto:**
    * O layout Masonry pode embaralhar a sequência lógica ou comparativa das categorias durante a leitura em equipe ou casal.
    * Foco exclusivo em escala visual de escolhas (matriz pura), sem suporte a campos textuais complementares (como alergias, safewords, notas de contexto).
    * Sem exportação em formato documental formal (PDF diagramado) ou planilha (CSV tabular com codificação UTF-8).
    * Sem suporte a internacionalização dinâmica nativa (dados embutidos em inglês).

---

## 3. Matriz Comparativa: Referências vs. Nosso Sistema (V1 MVP)

| Dimensão | AdhesiveCheese | Goctionni (v1/v2) | Kinklist GitLab.io | **Nosso Projeto (KinkConsentManager)** |
| :--- | :--- | :--- | :--- | :--- |
| **Framework / Arquitetura** | jQuery + HTML | Vanilla JS / jQuery Monolítico | Preact + Signals + Rolldown | **Angular (Standalone) + TypeScript Estrito + PrimeNG** |
| **Gerenciamento de Estado** | Estado no DOM | Objeto global + DOM | Map de Preact Signals | **`BaseStateService<T>` com Signals nativos do Angular** |
| **Camada de Dados** | Arquivos `.txt` brutos | Hardcoded no HTML | DSL em string compilada | **JSON Schema Versionado (`checklist-v1.json`) puramente orientado a IDs** |
| **Abstração de Repositório** | Nenhuma (chamadas ajax fixas) | Nenhuma | Hardcoded local / ATProto | **Padrão Repository (`ISchemaRepository` -> `StaticJsonSchemaRepository` v1 / `HttpNode` v2)** |
| **Dual-Role (Dar vs. Receber)** | Parcial | Sim (Giving/Receiving/etc.) | Sim (Multi-participante) | **Nativo por Categoria e Item (`dualRole: true/false`)** |
| **Tipos de Resposta** | Apenas escala de círculos | Apenas escala de círculos | Apenas escala de círculos | **5 Tipos: `scale_matrix`, `single_choice`, `multiple_choice`, `allowOtherOption`, `restricted_text`** |
| **Internacionalização (i18n)** | Nenhuma | Nenhuma | Nenhuma | **Total (`I18nService` + `@ngx-translate/core` para `pt-BR` e `en-US` em tempo real)** |
| **UX Mobile** | Péssima (tabela larga) | Péssima (tabela larga) | Média (Masonry empilhado) | **Excelente (Mobile-First: Accordion + Botão Next passo a passo + Alternância View Full)** |
| **Privacidade** | Baixa (Upload Imgur) | Alta (Local/URL) | Alta (Local/ATProto) | **Máxima (100% Client-Side, Zero chamadas de rede para dados íntimos na v1)** |
| **Exportações Disponíveis** | Imagem Imgur | Imagem Canvas / URL | Imagem Canvas | **PNG (Full Grid Vertical), PDF estruturado (`pdfmake`), JSON Draft portátil, CSV com BOM** |
| **Roadmap v2 Mapeado** | Não | Não | Não | **Sim (Badges e Modais "Em Breve" para Contratos D/s, Custom Builder, Gestão de Parceiros)** |

---

## 4. Requisitos Funcionais (RF)

### 4.1. Módulo de Preenchimento Interativo (`/checklist`)
* **RF01 — Checklist Dinâmico Orientado a Schema:** O sistema deve renderizar grupos e itens baseando-se exclusivamente no arquivo de especificação lógica `assets/schemas/checklist-v1.json`.
* **RF02 — Suporte Abrangente a Dual-Role:**
  * Se o grupo ou item estiver marcado com `dualRole: true`, a interface deve apresentar os dois papéis de atuação (**Ativo / Aplicar / Dar** vs. **Passivo / Sentir / Receber**).
  * Se marcado com `dualRole: false`, deve apresentar apenas uma resposta consolidada de consentimento/interesse.
* **RF03 — Matriz de Tipos de Entradas Suportados:**
  1. `scale_matrix`: Seleção na escala de 5 níveis de consentimento/limite (*Hard Limit*, *Soft Limit*, *Curious/A testar*, *Enjoy/Autorizado*, *Favorite/Preferência alta*).
  2. `single_choice`: Seleção de opção única usando componentes `p-radioButton`.
  3. `multiple_choice`: Seleção múltipla usando componentes `p-checkbox`.
  4. `allowOtherOption`: Quando ativo, inclui automaticamente um item `"Outro (especifique)"` com um campo de texto dinâmico para preenchimento.
  5. `restricted_text`: Campo de texto curto restrito por limite de caracteres (`maxLength`, ex: 300 caracteres) para informações pontuais imprevisíveis (alergias, restrições médicas, palavras de segurança).
* **RF04 — Navegação Híbrida Guiada e Completa:**
  * **Modo Accordion (Padrão Mobile-First):** Renderiza as categorias em painéis sanfonados (`p-accordion`). Ao abrir uma categoria, foca o usuário naquele tema. Ao final de cada categoria, exibe um botão **`Próxima Categoria (Next)`**, que valida visualmente o bloco atual, fecha-o e expande automaticamente a próxima categoria.
  * **Modo View Full:** Alternador de visualização na barra superior que expande simultaneamente todas as categorias para permitir revisão rápida ou visualização desktop clássica.
* **RF05 — Barra de Progresso em Tempo Real:** Indicador visual de percentual de conclusão calculado a partir do total de itens obrigatórios/configurados respondidos.
* **RF06 — Troca de Idioma em Tempo Real sem Perda de Estado:** O usuário pode alternar entre Português (`pt-BR`) e Inglês (`en-US`) a qualquer momento através do `I18nService`. Todos os títulos, descrições, labels e tooltips devem se atualizar imediatamente, mantendo intocadas todas as respostas já assinaladas.

### 4.2. Módulo de Exportação e Portabilidade (`/export`)
* **RF07 — Prévia Full Grid Vertical:** Exibir tela de conferência prévia diagramada em formato vertical (categorias empilhadas em largura total), otimizada para legibilidade sem colunas comprimidas.
* **RF08 — Exportação em Imagem PNG de Alta Definição:**
  * Renderizar o grid completo em elemento de impressão dedicado (1080px a 1200px de largura).
  * Converter em arquivo PNG para download imediato no dispositivo do usuário utilizando `html-to-image` e Canvas, sem submissão a servidores externos.
* **RF09 — Exportação em Documento PDF Estruturado:**
  * Geração programática via `pdfmake`.
  * Inclusão de cabeçalho padronizado (título, versão do schema, data e hora da geração, idioma).
  * Legenda com códigos de cor e ícones.
  * Paginação inteligente com controle de quebra de linhas para nunca seccionar itens de consentimento no meio.
* **RF10 — Exportação e Importação de Rascunho JSON (Portabilidade):**
  * **Exportar Rascunho:** Baixar arquivo `.json` leve contendo metadados (`schemaVersion`, `exportedAt`) e o mapa de respostas indexado exclusivamente por `itemId`.
  * **Importar Rascunho:** Permitir upload de arquivo JSON previamente exportado, validando a versão do schema e restabelecendo instantaneamente as marcações na interface.
* **RF11 — Exportação Tabular CSV:**
  * Geração de planilha tabular com codificação `UTF-8 com BOM` (`\uFEFF`) para compatibilidade nativa com Excel, Google Planilhas e LibreOffice.
  * Colunas: `Group_ID`, `Category`, `Item_ID`, `Item_Label`, `Giving_Response`, `Receiving_Response`, `Selected_Options`, `Custom_Note`.

### 4.3. Módulo de Roadmap v2 (Badges e Modais Informativos)
* **RF12 — Elementos com Identificação "Em Breve / Coming Soon":**
  * Rotas e itens de menu dedicados para **Contratos D/s** (`/contract`), **Custom Builder** (`/custom-builder`) e **Gestão de Parceiros** (`/partners`).
  * Botão de exportação **Excel (.xlsx)** com badge informativa na tela de exportação.
  * Ao clicar, exibir um modal ou tela informativa destacando o escopo futuro e a proposta de valor da funcionalidade na v2.

---

## 5. Requisitos Não-Funcionais (RNF)

* **RNF01 — Privacidade e Isolamento de Dados (Zero-Knowledge Client-Side):**
  * Na versão 1, a aplicação não deve possuir nenhum endpoint de telemetria, analytics intrusivo ou armazenamento em nuvem que trafegue dados das respostas.
  * Todas as operações de preenchimento, processamento e exportação (PNG, PDF, JSON, CSV) ocorrem estritamente no runtime do navegador do usuário.
* **RNF02 — Arquitetura de Componentes e Padrões de Código:**
  * Angular 18+ ou 19+ com **Standalone Components** habilitados em 100% da aplicação.
  * Separação estrita de arquivos: proibido o uso de templates inline ou estilos inline. Cada componente deve possuir obrigatoriamente 4 arquivos: `.component.ts`, `.component.html`, `.component.scss` e `.spec.ts`.
  * Tipagem estrita no TypeScript (`strict: true`, `noImplicitAny: true`).
* **RNF03 — Desempenho e Reatividade:**
  * Uso prioritário de `Signals` e `computed` nativos do Angular para gerenciar estados reativos, eliminando re-renderizações desnecessárias da árvore de componentes.
  * Lazy loading em todas as rotas secundárias (`/export`, placeholders).
* **RNF04 — Acessibilidade e Contraste Visual (WCAG 2.1 AA):**
  * Elementos interativos de escala de cor devem possuir textos alternativos, atributos `aria-label` e ícones associados para não depender exclusivamente de percepção cromática (essencial para pessoas daltônicas).
  * Foco visível e navegabilidade por teclado nas listas e botões de ação.
* **RNF05 — Extensibilidade para Backend Node.js (V2 Ready):**
  * A arquitetura deve empregar o padrão **Repository** (`ISchemaRepository`) e serviços genéricos base (`BaseDataService<T>`, `BaseStateService<T>`), permitindo que a troca da fonte de dados estática (`assets/schemas/checklist-v1.json`) para uma API REST em Node.js ocorra apenas por injeção de dependência, sem alterar componentes da UI.

---

## 6. Arquitetura de Dados e Contratos TypeScript

### 6.1. Definição do Schema do Checklist (`ChecklistSchema`)
```typescript
export interface ScaleOption {
  id: string;             // ex: 'hard_limit', 'enjoy'
  order: number;          // ordem visual na legenda
  color: string;          // código hexadecimal ou classe de cor
  icon: string;           // classe PrimeIcons (ex: 'pi-ban', 'pi-heart-fill')
}

export type QuestionType = 
  | 'scale_matrix' 
  | 'single_choice' 
  | 'multiple_choice' 
  | 'restricted_text';

export interface ItemDefinition {
  id: string;                    // ex: 'item_spanking_manual'
  type: QuestionType;
  dualRole?: boolean;            // se omitido, herda do grupo
  scaleRef?: string;             // referência da escala usada (default: 'default')
  options?: string[];            // lista de IDs de opções para single/multiple choice
  allowOtherOption?: boolean;    // flag para adicionar campo "Outro"
  maxLength?: number;            // limite para restricted_text
}

export interface GroupDefinition {
  id: string;                    // ex: 'grp_impact_play'
  order: number;
  defaultDualRole: boolean;      // padrão de papéis para o grupo
  items: ItemDefinition[];
}

export interface ChecklistSchema {
  schemaVersion: string;         // ex: '1.0.0'
  scales: ScaleOption[];
  groups: GroupDefinition[];
}
```

### 6.2. Estrutura do Estado de Respostas (`ChecklistAnswers`)
```typescript
export interface ItemResponseValue {
  giving?: string;               // ID da escala para o papel ativo
  receiving?: string;            // ID da escala para o papel passivo
  single?: string;               // ID da escala ou da opção única
  selectedOptions?: string[];    // IDs das opções selecionadas (multiple_choice)
  otherText?: string;            // Texto especificado caso allowOtherOption seja usado
  customText?: string;           // Texto preenchido em restricted_text
}

export interface ChecklistDraft {
  schemaVersion: string;
  exportedAt: string;            // Formato ISO 8601
  language: string;              // Idioma ativo no momento da exportação
  answers: Record<string, ItemResponseValue>; // Chave é o itemId
}
```

### 6.3. Estrutura de Internacionalização (Mapeamento por IDs)
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
      "tooltip": "Tapas aplicados na região glútea com a palma da mão."
    }
  },
  "options": {
    "opt_hand": "Mãos livres",
    "opt_paddle": "Paddle / Palmatória"
  }
}
```

---

## 7. Conclusão do Levantamento
Este levantamento técnico-funcional consolida as melhores lições extraídas das implementações legadas e contemporâneas (AdhesiveCheese, Goctionni e Kinklist.gitlab.io), eliminando seus pontos fracos (riscos de privacidade, tabelas rígidas em mobile, falta de i18n e arquiteturas não-modulares) e estabelecendo uma base sólida para a implementação do projeto em Angular Standalone e PrimeNG.
