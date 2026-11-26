# Especificação de Feature: Backend de Autenticação e Sincronização em Nuvem (Cloud Sync)

**Projeto:** KinkConsentManager  
**Área:** Backend & Persistência em Nuvem  
**Arquitetura Espelho:** `C:\git\SmartCoreHub\backend` (`APIs/` + `Implementations/` + `build/` + CPM)  
**SDK Central:** [`SmartCoreHub.Core.SDK`](https://www.nuget.org/packages/SmartCoreHub.Core.SDK)  
**Documentos Oficiais Vinculados:**  
1. [Documento Funcional: Autenticação e Sincronização](../Backend/DOCUMENTO_FUNCIONAL_AUTENTICACAO_E_SYNC.md)  
2. [Documento de Implementação Técnica (`SmartCoreHub` + `Core.SDK` + Supabase EF Core)](../Backend/DOCUMENTO_IMPLEMENTACAO_BACKEND.md)  
3. [Documento de Progresso e Checklist de Implantação](../Backend/DOCUMENTO_PROGRESSO_BACKEND.md)  

---

## 1. Contexto e Motivação

Até a Versão 1 (V1), o **KinkConsentManager** operava exclusivamente no cliente (*client-side*), com persistência em `localStorage` cifrada com Web Crypto AES-GCM 256-bit.

Para a **V2**, iniciamos a implantação do ecossistema de **Backend** em **.NET 10 (`net10.0`)** utilizando o pacote NuGet **`SmartCoreHub.Core.SDK`** e **Supabase (PostgreSQL 16 + EF Core 9)**, permitindo que usuários criem contas, realizem login e optem (*opt-in*) por sincronizar suas respostas na nuvem para acesso multi-dispositivo, mantendo o modo anônimo local 100% funcional.

### Delimitação da Etapa Atual (Fase 1 — Foco Imediato)
Nesta primeira etapa, o escopo concentra-se **estritamente na fundação do backend e na API de Autenticação e Cadastro de Usuários**:
- Estrutura física idêntica a `C:\git\SmartCoreHub\backend` (`APIs/`, `Implementations/`, `build/TestAssertions.props`, `Directory.Packages.props` CPM, `global.json`);
- Reaproveitamento integral de **`SmartCoreHub.Core.SDK`**: `LongEntityBase` (`long Id`), Value Object `Email`, `ServiceResponse<T>`, `LoginDto`, `RefreshTokenDto`, `PasswordHasherFactory` (`BcryptPasswordHasher`), `IJwtAccessTokenService` / `JwtAccessTokenService`, `TokenConfigurationServiceCollectionExtensions`, `GenericRepository<T, TCtx>`, `IEfDbContextScope<T>`, `EfTransactionExecutor`, `IApplicationDispatcher` (CQRS), `BaseApiController`, `OpenApiDocumentationOptions`, `ApiPerformanceExtensions`, middlewares de segurança/correlação/cultura e endpoints `/health` e `/ready`;
- Cadastro simples com nome, login, email e confirmação de senha forte (`FluentValidation`);
- Autenticação JWT assinada com **`HS512`** (`TokenConfigurations:Secret` ≥ 64 bytes) e **Refresh Token Rotation** + **Reuse Detection** (persistência em hash SHA-256);
- Banco de dados PostgreSQL no **Supabase** via **EF Core 9 (`Npgsql.EntityFrameworkCore.PostgreSQL` `9.0.4`)**, com isolamento obrigatório de schema em `kink_consent` (`HasDefaultSchema("kink_consent")` + `MigrationsHistoryTable(..., "kink_consent")`) e migrations aplicadas via **Direct Connection (porta `5432`)**;
- Arquitetura já preparada para a **Fase 2** (persistência do Report `ChecklistDraft` em coluna nativa `jsonb` em `kink_consent.UserReports`) e **Fase 3** (toggle *Cloud Autosave* na tela `/checklist/fill`).

---

## 2. Mapa dos Documentos Detalhados

Consulte a documentação completa nos arquivos canônicos da pasta [`docs/Backend/`](../Backend/):

* 📄 **[DOCUMENTO_FUNCIONAL_AUTENTICACAO_E_SYNC.md](../Backend/DOCUMENTO_FUNCIONAL_AUTENTICACAO_E_SYNC.md):**  
  Especifica os atores, ciclo de vida de sessão, requisitos `RF-01` a `RF-09` (cadastro, login anti-enumeração, refresh rotation, logout, `/me`, toggle de cloud autosave e resolução de conflitos Local vs. Nuvem), catálogo de `MessageKey` e códigos HTTP, requisitos não-funcionais/LGPD, diagramas Mermaid e critérios de aceite *Given/When/Then*.

* 🛠️ **[DOCUMENTO_IMPLEMENTACAO_BACKEND.md](../Backend/DOCUMENTO_IMPLEMENTACAO_BACKEND.md):**  
  Guia técnico detalhado espelhando `C:\git\SmartCoreHub\backend` com matriz de reaproveitamento do `SmartCoreHub.Core.SDK`, `Directory.Packages.props` alinhado (EF Core 9 + .NET 10), entidades `LongEntityBase`, configuração `HS512` (`TokenConfigurations`), `KinkConsentManagerDbContextPostgreSql` isolado em `kink_consent`, comparativo `jsonb` vs. Supabase Storage, composição DI e playbook CLI passo a passo.

* 📋 **[DOCUMENTO_PROGRESSO_BACKEND.md](../Backend/DOCUMENTO_PROGRESSO_BACKEND.md):**  
  Orquestração em Ondas (0 a 3) da Fase 1 (`B1.1` a `B1.13`), planejamento da Fase 2 (`B2.1` a `B2.7`) e Fase 3 (`B3.1` a `B3.8`), matriz de riscos técnicos e critérios de *Definition of Done (DoD)*.
