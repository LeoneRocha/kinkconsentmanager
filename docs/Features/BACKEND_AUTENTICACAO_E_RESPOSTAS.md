# Especificação de Feature: Backend de Autenticação e Sincronização em Nuvem (Cloud Sync)

**Projeto:** KinkConsentManager  
**Área:** Backend & Persistência em Nuvem  
**Documentos Oficiais Vinculados:**  
1. [Documento Funcional: Autenticação e Sincronização](../Backend/DOCUMENTO_FUNCIONAL_AUTENTICACAO_E_SYNC.md)  
2. [Documento de Implementação Técnica (Arquitetura SmartCoreHub + Supabase EF Core)](../Backend/DOCUMENTO_IMPLEMENTACAO_BACKEND.md)  
3. [Documento de Progresso e Checklist de Implantação](../Backend/DOCUMENTO_PROGRESSO_BACKEND.md)  

---

## 1. Contexto e Motivação

Até a Versão 1 (V1), o **KinkConsentManager** operava exclusivamente no cliente (*client-side*), com persistência em `localStorage` cifrada com AES-GCM 256-bit.

Para a **V2**, iniciamos a implantação do ecossistema de **Backend**, projetado para permitir que usuários se cadastrem, realizem login e optem por sincronizar suas respostas de checklist na nuvem, acessando seus relatórios a partir de qualquer dispositivo com total segurança e conveniência.

### Delimitação da Etapa Atual (Foco Imediato)
Nesta primeira etapa, o escopo de implementação concentra-se **estritamente na API de Autenticação e Cadastro de Usuários**:
- Cadastro simples com nome, login, email e confirmação de senha;
- Política de senhas de alta entropia com validações declarativas via FluentValidation;
- Criptografia com algoritmo **BCrypt** de alto fator de custo (Work Factor 11/12) com salt embutido e verificação *timing-safe*, espelhando a implementação do projeto de referência **SmartCoreHub**;
- Autenticação e emissão de tokens **JWT Bearer** com Refresh Tokens rotacionáveis;
- Banco de dados PostgreSQL no **Supabase** via **Entity Framework Core (EF Core Code First & Migrations)** com provedor `Npgsql.EntityFrameworkCore.PostgreSQL`;
- Isolamento obrigatório de schema relacional (`kink_consent`) para não conflitar com schemas internos do Supabase (`auth`, `storage`, etc.);
- Planejamento arquitetural já estruturado para a Etapa 2 (persistência do Report de respostas em coluna nativa `jsonb` no PostgreSQL, com toggle opt-in na tela de preenchimento).

---

## 2. Mapa dos Documentos Detalhados

Consulte a documentação completa nos arquivos canônicos da pasta `docs/Backend/`:

* 📄 **[DOCUMENTO_FUNCIONAL_AUTENTICACAO_E_SYNC.md](../Backend/DOCUMENTO_FUNCIONAL_AUTENTICACAO_E_SYNC.md):**  
  Especifica a visão funcional, os atores (Visitante vs. Usuário Autenticado), os requisitos de cadastro (RF-01), login (RF-02), refresh token (RF-03), endpoint do usuário corrente (RF-04), autosave opt-in em nuvem (RF-05), carregamento de respostas (RF-06), critérios de aceite e diagramas de sequência Mermaid.

* 🛠️ **[DOCUMENTO_IMPLEMENTACAO_BACKEND.md](../Backend/DOCUMENTO_IMPLEMENTACAO_BACKEND.md):**  
  Especificação técnica aprofundada baseada na Clean Architecture do `SmartCoreHub.backend` (`Domain`, `Infrastructure`, `Service`, `API`, `Tests`), integração com Supabase, diretrizes de portas e pooler (Direct Connection porta 5432 para migrations), isolamento do schema `kink_consent`, análise comparativa entre Supabase Storage vs. coluna `jsonb`, código do Hasher BCrypt, entidades C#, configurações Fluent API, contratos de DTOs e guia de execução via CLI `.NET`.

* 📋 **[DOCUMENTO_PROGRESSO_BACKEND.md](../Backend/DOCUMENTO_PROGRESSO_BACKEND.md):**  
  Checklist granular com matriz de tarefas para a **Fase 1 (API de Login e Cadastro)**, visão de futuro para a **Fase 2 (Report jsonb)** e **Fase 3 (Integração Frontend)**, critérios de Definition of Done (DoD) e painel executivo de progresso.
