# Plataforma de Gestão de Limites e Consentimento (BDSM / D/s)
> Aplicação web moderna, responsiva (*mobile-first*), acessível e **100% client-side** em Angular e PrimeNG para preenchimento, visualização e exportação de checklists de consentimento e limites consensuais.

---

## 📚 Documentação Técnica e Arquitetural do Projeto

Toda a especificação, análise de referências e planejamento técnico estão estruturados nos seguintes documentos:

1. **[Blueprint de Arquitetura e Definição de Requisitos (v1.0)](./Bueprint.md):** Decisões arquiteturais mestras, visão de produto, escopo da v1 e roadmap da v2.
2. **[Levantamento Funcional e Técnico](./docs/LEVANTAMENTO_FUNCIONAL_TECNICO.md):** Requisitos funcionais (RF), requisitos não-funcionais (RNF), contratos TypeScript, modelagem de dados e análise comparativa profunda dos projetos de referência (*AdhesiveCheese*, *Goctionni* e *Kinklist GitLab.io*).
3. **[Plano de Implementação Front-end](./docs/PLANO_IMPLEMENTACAO_FRONTEND.md):** Arquitetura de componentes Angular Standalone, regra estrita dos 4 arquivos (`.ts`, `.html`, `.scss`, `.spec.ts`), camada de estado com Signals, padrão Repository, motores de exportação (PNG, PDF, JSON Draft, CSV) e theming PrimeNG.
4. **[Checklist de Implementação, Etapas e Progresso](./docs/CHECKLIST_IMPLEMENTACAO_PROGRESSO.md):** Matriz de 40 tarefas divididas em 8 fases incrementais com critérios de aceite objetivos, dependências e painel de progresso.

---

## 🔍 Referências de Domínio e UX Analisadas
* `references/adhesivecheese`: KinkList pioneiro em jQuery com parsing de arquivos de texto e botões circulares coloridos.
* `references/Goctionni`: Evolução do modelo Dual-Role (*Giving* vs. *Receiving*), persistência de estado em URL hash e tabelas estruturadas.
* `references/kinklist.gitlab.io`: Aplicação moderna em TypeScript, Preact Signals, exportação modular para Canvas com texturas SVG e empacotamento com Rolldown.
