# KinkConsentManager
> Aplicação web moderna, modular, acessível e **100% client-side** em Angular (Standalone + Signals) e PrimeNG para preenchimento, visualização e exportação de Checklists de Limites e Consentimento Consensual (BDSM / D/s).

---

## 🎯 Foco da Versão 1 (MVP)
A **V1 concentra-se exclusivamente no módulo de Checklist** com altíssima qualidade, cobertura rigorosa de testes unitários e privacidade absoluta (zero envio de dados a servidores):
* **Checklist Dinâmico Orientado a JSON (`checklist-v1.json`)** com suporte configurável a **Dual-Role** (*Giving/Receiving*, *Dominant/Submissive*, *Self/Partner* ou papel único).
* **5 Tipos de Entrada:** `scale_matrix`, `single_choice`, `multiple_choice`, `allowOtherOption` e `restricted_text`.
* **Bilíngue em Tempo Real (`pt-BR` / `en-US`)** sem perda das respostas preenchidas.
* **UX Mobile-First:** Navegação guiada por **Accordion + botão Next**, modo **Quick-Fill Wizard** (atalhos de teclado `0-5` e setas) e alternância para **View Full**.
* **Exportação e Portabilidade 100% Client-Side:** PNG (Full Grid Vertical), PDF (`pdfmake`), JSON Draft (exportar/importar) e CSV (UTF-8 BOM).

> Funcionalidades adicionais como *Motor de Contratos D/s*, *Custom Builder*, *Gestão de Play Partners / Diff*, *Excel `.xlsx`* e *Backend Node.js* estão documentadas como **Fora de Escopo na V1** para decisão posterior.

---

## 📚 Documentação Técnica do Projeto

1. **[Blueprint de Arquitetura (v1.0)](./Bueprint.md):** Decisões arquiteturais originais do projeto.
2. **[Levantamento Funcional e Técnico (v2.0)](./docs/LEVANTAMENTO_FUNCIONAL_TECNICO.md):** Escopo fechado da V1 vs. backlog futuro, análise técnica aprofundada dos códigos de referência, requisitos funcionais/não-funcionais e contratos TypeScript oficiais.
3. **[Plano de Implementação Front-end (v2.0)](./docs/PLANO_IMPLEMENTACAO_FRONTEND.md):** Arquitetura modular *Smart/Dumb*, regra dos 4+1 arquivos por componente, divisão em **5 Workstreams paralelos para múltiplos agentes** e especificações completas dos testes unitários (`.spec.ts`).
4. **[Checklist de Implementação, Etapas e Progresso (v2.0)](./docs/CHECKLIST_IMPLEMENTACAO_PROGRESSO.md):** Orquestração em Ondas (Gate 0 → 5 Agentes Paralelos → Gate Integração/QA), matriz de 35 tarefas com critérios de aceite e comandos de validação.

---

## 🔍 Referências de Código Analisadas
* [`references/adhesivecheese`](./references/adhesivecheese): Parsing de arquivos `.txt`, balanceamento de colunas no DOM, hash Base-70 e Canvas export.
* [`references/Goctionni`](./references/Goctionni): Taxonomia Dual-Role consagrada (`v0.1` a `v1.0.2`), editor inline e Modo Guiado Rápido (`#InputOverlay`) com atalhos de teclado.
* [`references/kinklist.gitlab.io`](./references/kinklist.gitlab.io): Stack TypeScript + Preact Signals, DSL com separador `:::` para descrições/tooltips, padrão visual hachurado no Canvas e modularização de exportação.
