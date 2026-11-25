# KinkConsentManager — Frontend (`v1.2.4`)

> Aplicação web SPA **100% client-side** (Zero-Knowledge), modular, acessível e bilíngue em **Angular 22** (Standalone + Signals + Zoneless + `OnPush`), **Angular Material 22.3** e **Font Awesome 7** para preenchimento, visualização e exportação segura de Checklists de Limites e Consentimento Consensual.

---

## Principais Capacidades Implementadas

- **Painel Inicial & Rotas Modulares (`core/routes/app-routes.config.ts`):**
  - `/dashboard` (padrão): visão geral com seção **Ferramentas** e progresso local salvo; retorno rápido ao clicar no título `.app-shell__brand-title` no topo.
  - `/checklist`: escolha do modo inicial de preenchimento e importação de rascunho JSON em background.
  - `/checklist/fill`: preenchimento completo protegido por `checklistFillGuard` (exige modo selecionado ou progresso/rascunho carregado).
  - `/checklist/export`: prévia em 2 etapas (*Visualização Moderna* ou *Visualização Clássica*) com exportação e impressão.
- **Checklist Dinâmico Orientado a Schema (`checklist-v1.json`):**
  - Suporte configurável a **Dual-Role** (*Dar / Receber*, *Dominante / Submisso*, *Em Mim / No(a) Parceiro(a)* ou papel único) e 5 tipos de entrada (`scale_matrix`, `single_choice`, `multiple_choice`, `allowOtherOption` e `restricted_text`).
  - **4 modos de preenchimento:** *Guiado (Passos)* com trilha circular e Revisão Final, *Modo Clássico*, *Visão Completa* e *Preenchimento Rápido* (`1–5`, `0`, `↑/↓`).
- **Temas Modulares por Tokens (`core/themes/`):**
  - **3 presets fixos** no menu superior: **Sóbrio (Preto & Branco com azul e degradê)**, **Claro (Vermelho)** e **Escuro (Vermelho)**, estruturados sobre `ThemeColorTokens` e `THEME_CSS_VAR_MAP` para futura customização pelo usuário.
- **Acessibilidade Audiovisual & Segurança Local:**
  - Leitura automática por foco (`(focusin)` via `AccessibilityService` + Web Speech API), barra de legendas visuais ao vivo, alto contraste WCAG AAA, escala de fonte, redução de animações, `alt` em imagens e `[attr.title]` em controles/ícones/textos.
  - Autosave criptografado no navegador via Web Crypto API AES-GCM 256-bit (`CryptoService` + `ChecklistAutosaveService`).
- **Web Worker Unificado & Exportação Client-Side (`core/workers/`):**
  - Exportação **XLSX** modular (OOXML nativo em *Visualização Moderna* com tons pastel e texto preto em negrito, ou *Visualização Clássica* em paisagem 3 colunas), **PDF** vetorial (`pdfmake`), **PNG** (`html-to-image`), **CSV** UTF-8 BOM, **JSON Draft** e **Imprimir** (`window.print()` + `@media print`).

---

## Comandos Úteis (em `frontend/`)

| Tarefa | Comando (Windows PowerShell) | Observação |
| ------ | ---------------------------- | ---------- |
| Servidor de desenvolvimento | `npm.cmd start` | `http://localhost:4200` (redireciona para `/dashboard`) |
| Build padrão | `npm.cmd run build` | Executa orquestrador de ambiente + `ng build` |
| Build de produção | `npm.cmd run build:prod` | Gera `dist/kinkconsentmanager` otimizado com *lazy chunks* |
| Paridade i18n | `npm.cmd run check:i18n` | Garante 100% de sincronia entre `pt-BR.json` e `en-US.json` |
| Testes unitários (CI) | `npm.cmd run test:ci` | Jest 30 zoneless (**73 suítes / 296 testes aprovados**) |
| Cobertura Jest | `npm.cmd run test:coverage` | Gera `coverage/` (`lcov.info`, `sonar-report.xml`, relatórios HTML) |

### Variáveis de Ambiente de Loading do Worker (Build-time)

Processadas por `scripts/worker-loading-config-updater.js` dentro de `prebuild` / `prebuild:prod`:

- `WORKER_LOADING_DELAY_MS` (padrão: `3000` ms)
- `WORKER_LOADING_START_DELAY_MS` (opcional, etapa inicial)
- `WORKER_LOADING_COMPLETION_DELAY_MS` (opcional, exibição concluída em verde `100%`)

---

## Documentação Técnica do Projeto

1. **[Índice Geral da Documentação](../docs/README.md):** mapa completo de guias, portas, URLs e status do repositório.
2. **[Changelog de Alterações e Melhorias](../docs/CHANGELOG_MELHORIAS.md):** histórico detalhado das entregas recentes.
3. **[Arquitetura do Sistema](../docs/ARCHITECTURE.md):** camadas, diagramas Mermaid, decisões técnicas e catálogo de dependências.
4. **[Diretrizes do Projeto (PROJECT_GUIDELINES)](../docs/PROJECT_GUIDELINES.md):** regras 4+1, Jest, i18n, acessibilidade e governança Git (`R-GOV-GIT`).
5. **[Levantamento Funcional e Técnico](../docs/Features/LEVANTAMENTO_FUNCIONAL_TECNICO.md)** · **[Plano Frontend](../docs/Features/PLANO_IMPLEMENTACAO_FRONTEND.md)** · **[Progresso](../docs/Features/CHECKLIST_IMPLEMENTACAO_PROGRESSO.md)**.
