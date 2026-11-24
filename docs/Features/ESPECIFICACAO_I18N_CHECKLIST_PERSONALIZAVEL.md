# Notas de Evolução — Separação de i18n (Questões) e Checklist Personalizável Multilíngue

> **Status:**  
> - **Objetivo 1 (Isolamento de `groups`, `items` e `options` + Camada Extensível por Provider):** **Implementado** (`assets/i18n/groups/{pt-BR,en-US}.json` com `groups`, `assets/i18n/questions/{pt-BR,en-US}.json` com `items` e `options`, `IQuestionTranslationsRepository`, `QUESTION_TRANSLATIONS_REPOSITORY_TOKEN`, `StaticJsonQuestionTranslationsRepository`, `QuestionTranslationsService` e `CompositeTranslateLoader`).  
> - **Objetivo 2 (Checklist Personalizável Multilíngue):** **Anotação para Levantamento Futuro (Pós-V1 / Roadmap V2+)** — ainda não implementado no código.  
> **Documentos relacionados:** [Blueprint](./../Bueprint.md) · [Levantamento Funcional e Técnico](./LEVANTAMENTO_FUNCIONAL_TECNICO.md) · [Arquitetura](./../ARCHITECTURE.md) · [PROJECT_GUIDELINES](./../PROJECT_GUIDELINES.md)

---

## 1. Contexto Atual na V1

Hoje, na V1, cada idioma suportado concentra em um único arquivo JSON (`frontend/src/assets/i18n/pt-BR.json` e `frontend/src/assets/i18n/en-US.json`) **dois domínios distintos**:

1. **Textos da interface da aplicação (`ui`):** navegação, botões, acessibilidade, alertas, exportação, autosave e seletor de modos.
2. **Conteúdo do checklist padrão (`checklist-v1.json`):** `roles`, `scales`, `groups`, `items` (`label` e `tooltip`/descrição) e `options`.

Atualmente:
- O carregamento é feito por `TranslateHttpLoader` configurado em [`app.config.ts`](../../frontend/src/app/app.config.ts) apontando para `./assets/i18n/{lang}.json`.
- A resolução na UI passa por [`I18nService`](../../frontend/src/app/core/services/i18n.service.ts) e `SchemaTranslatePipe`.
- A paridade estrutural é validada por [`schema-integrity.spec.ts`](../../frontend/src/app/core/models/__tests__/schema-integrity.spec.ts) e [`check-i18n-keys.mjs`](../../frontend/scripts/check-i18n-keys.mjs).

Esse acoplamento funciona bem para um único checklist fixo, mas dificulta a evolução para **templates múltiplos** e **checklists personalizados pelo usuário** com suporte independente a idiomas.

---

## 2. Objetivo 1 — Isolar Traduções de Questões e Descrições em Pasta Separada

Separar os dicionários de **interface fixa (`ui`)** dos dicionários de **questões, descrições e opções do checklist**, movendo o conteúdo do checklist para uma pasta isolada dentro de `assets/i18n/`.

### Estrutura Sugerida de Pastas (a validar no levantamento)

```text
frontend/src/assets/i18n/
├── ui/
│   ├── pt-BR.json                 # Apenas namespace "ui" (shell, botões, alertas, exportação)
│   └── en-US.json
└── checklist/                     # Conteúdo do checklist isolado da UI (ou checklist/v1/)
    ├── pt-BR/
    │   ├── items.json             # Questões e descrições (label + tooltip) isoladas
    │   └── structure.json         # (Opcional) groups, options, roles e scales — ou tudo em checklist/{lang}.json
    └── en-US/
        ├── items.json
        └── structure.json
```

> **Alternativa mais simples:** manter `assets/i18n/ui/{lang}.json` para a interface e `assets/i18n/checklist/{lang}.json` (ou `assets/i18n/questions/{lang}.json` apenas para `items` com `label` e `tooltip`) caso `roles`/`scales`/`groups`/`options` sigam junto ao domínio do checklist.

### Exemplo do Bloco Isolado por Questão (`items`)

Cada questão passa a viver de forma isolada e reutilizável por ID, preservando `label` (título da prática/pergunta) e `tooltip` (descrição explicativa exibida no ícone informativo `i`):

```json
{
  "items": {
    "item_safeword_system": {
      "label": "Sistema de Safeword (Palavra de Segurança)",
      "tooltip": "Escolha o mecanismo principal combinado para desacelerar, pausar ou encerrar imediatamente uma cena."
    }
  }
}
```

### Benefícios Esperados da Separação

- **Manutenção independente:** evoluir perguntas e descrições sem poluir nem arriscar chaves da interface (`ui`).
- **Base para múltiplos templates:** facilita carregar pacotes de tradução por versão/template de checklist sem duplicar textos da aplicação.
- **Governança de chaves (`check:i18n`):** `check-i18n-keys.mjs` pode continuar validando exclusivamente chaves estáticas de `ui`, enquanto `schema-integrity.spec.ts` valida a cobertura completa do schema padrão (`checklist-v1.json`) contra a pasta separada.

---

## 3. Objetivo 2 — Funcionalidade Futura: Checklist Personalizado com Suporte a Idiomas

Permitir futuramente que o usuário **personalize o checklist** (criar, editar, reordenar ou remover categorias, perguntas, descrições/`tooltip` e opções de resposta) informando os textos no(s) idioma(s) que desejar cadastrar.

### Pontos Funcionais para o Levantamento Futuro

- **Idioma principal e idiomas opcionais do checklist personalizado:**
  - Ao criar ou editar um checklist personalizado, o usuário define ao menos **1 idioma principal suportado** (ex.: `pt-BR` ou `en-US`) e pode, opcionalmente, cadastrar traduções para outros idiomas.
- **Metadados sugeridos no modelo do checklist personalizado:**
  - `defaultLanguage`: idioma padrão definido pelo autor do checklist personalizado.
  - `supportedLanguages`: lista de idiomas efetivamente preenchidos/suportados por aquele checklist (ex.: `["pt-BR"]` ou `["pt-BR", "en-US"]`).
  - `translations`: mapa `{ [lang]: { groups, items: { [id]: { label, tooltip } }, options, ... } }` embutido no pacote/rascunho personalizado.

---

## 4. Regra Obrigatória para Idiomas Não Cadastrados pelo Usuário

> **Regra de Negócio Definida:**  
> Se o usuário **não cadastrar outros idiomas** para o checklist personalizado, esse checklist **só poderá ser visualizado no idioma suportado** em que foi cadastrado — exibindo uma **mensagem informativa clara** ao usuário quando o idioma ativo da interface não estiver disponível no checklist.

### Comportamentos a Especificar no Levantamento

1. **Detecção de incompatibilidade de idioma:**
   - O usuário troca o idioma da aplicação (ex.: interface em `en-US`), mas o checklist personalizado ativo possui `supportedLanguages: ["pt-BR"]`.
2. **Proibição de chaves cruas na tela:**
   - Nunca exibir IDs técnicos (ex.: `items.custom_1.label`) quando faltar tradução para o idioma selecionado na interface.
3. **Alternativas de UX a decidir no levantamento detalhado:**
   - **Opção A (Bloqueio explícito com aviso):** exibir mensagem informando que o checklist personalizado está disponível apenas no(s) idioma(s) cadastrado(s) (ex.: *"Este checklist personalizado está disponível apenas em Português (Brasil). Altere o idioma ou adicione traduções para visualizá-lo em English (US)."*) com botão rápido para alternar para o idioma suportado.
   - **Opção B (Exibição no idioma suportado + banner de aviso):** manter a interface (`ui`) no idioma escolhido ou travar a visualização do conteúdo do checklist no `defaultLanguage` suportado, exibindo um banner claro avisando que o conteúdo do checklist só possui cadastro naquele idioma.
4. **Consistência na Exportação (`/export`):**
   - Garantir que PNG, PDF, Impressão, CSV e JSON respeitem a mesma regra de idioma suportado (informando o idioma real do checklist personalizado ou impedindo exportação mista inconsistente quando não houver tradução cadastrada).

---

## 5. Impactos Técnicos Mapeados para o Levantamento Posterior

| Camada / Arquivo | Ponto de Atenção para o Levantamento |
| ---------------- | ------------------------------------ |
| Loader de Traduções ([`app.config.ts`](../../frontend/src/app/app.config.ts)) | Substituir `TranslateHttpLoader` simples por `TranslateLoader` composto capaz de mesclar `assets/i18n/ui/{lang}.json` + pasta separada de questões/checklist (e traduções dinâmicas de checklists personalizados). |
| Serviço i18n ([`I18nService`](../../frontend/src/app/core/services/i18n.service.ts)) | Separar resolução de `ui` vs. conteúdo do checklist; adicionar verificação de `supportedLanguages` do schema ativo e fallback/aviso controlado para checklists personalizados. |
| Modelo e Repositório ([`ISchemaRepository`](../../frontend/src/app/core/repositories/schema.repository.ts)) | Prever metadados de idiomas suportados no schema (`defaultLanguage`, `supportedLanguages`) e possível fonte local/customizada além do `StaticJsonSchemaRepository`. |
| Portabilidade Zero-Knowledge ([`JsonDraftService`](../../frontend/src/app/features/export/services/json-draft.service.ts)) | Avaliar se rascunhos/templates personalizados exportados em `.json` passam a carregar `schema` + `translations` por idioma para funcionar 100% offline/client-side ao importar em outro navegador. |
| Scripts e Testes ([`check-i18n-keys.mjs`](../../frontend/scripts/check-i18n-keys.mjs), [`schema-integrity.spec.ts`](../../frontend/src/app/core/models/__tests__/schema-integrity.spec.ts)) | Atualizar caminhos de leitura JSON nos testes de integridade e garantir paridade entre `ui/` e a pasta isolada de questões. |

---

## 6. Questões em Aberto para Refinar Depois

- O isolamento será **apenas de `items` (`label` + `tooltip`)** ou de todo o conteúdo do checklist (`groups`, `items`, `options`, `roles`, `scales`)?
- Quando um checklist personalizado tiver apenas 1 idioma cadastrado e o usuário estiver com a UI em outro idioma, o sistema deve **bloquear a visualização com ação rápida para trocar de idioma** (Opção A) ou **exibir o conteúdo no idioma cadastrado com aviso** (Opção B)?
- Na V2+, a edição de traduções de perguntas personalizadas permitirá **tradução parcial** (fallback por item para o `defaultLanguage`) ou exigirá **tradução completa** de todos os itens para liberar um segundo idioma na lista `supportedLanguages`?
