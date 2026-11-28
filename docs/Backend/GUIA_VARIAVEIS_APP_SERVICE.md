# Guia Passo a Passo — Variáveis de Ambiente no Azure App Service (`KinkConsentManager.API`)

Este documento descreve o passo a passo completo para configurar as variáveis de ambiente (**App Settings** e **Connection Strings**) da API **`KinkConsentManager.API`** (.NET 10) no **Azure App Service**, com base na estrutura oficial de [appsettings.json](../../backend/APIs/KinkConsentManager.API/appsettings.json) e [appsettings.Development.json](../../backend/APIs/KinkConsentManager.API/appsettings.Development.json).

> [!CAUTION]
> **Segurança e Governança:** todos os valores abaixo são **exemplos fictícios**. Nunca versione senhas, strings de conexão reais do Supabase, `TokenConfigurations__Secret` ou `SecuritySettings__AesGcmSettings__Key` no Git ou em arquivos Markdown. Em produção, prefira **Azure Key Vault References** (`@Microsoft.KeyVault(SecretUri=...)`).

---

## 1. Regra de Nomenclatura no Azure App Service (Linux vs. Windows)

No ASP.NET Core, seções aninhadas do `appsettings.json` (como `SecuritySettings` → `AesGcmSettings` → `Key`) são mapeadas por variáveis de ambiente:

| Ambiente do App Service | Separador Aceito | Recomendação |
| --- | --- | --- |
| **Linux / Container** | `__` (duplo underscore) | **Obrigatório usar `__`** (`:` não é permitido em variáveis POSIX) |
| **Windows** | `:` ou `__` | **Use `__`** para manter portabilidade entre Windows, Linux, Docker e CI/CD |

Arrays JSON (como `Cors:AllowedOrigins` e `Localization:FunctionalMessages:SupportedCultures`) são indexados a partir de `0`: `Cors__AllowedOrigins__0`, `Cors__AllowedOrigins__1`, etc.

---

## 2. Pré-requisito — Gerar Chaves Seguras (Antes de Abrir o Portal)

A API possui validação **fail-fast** no startup para dois segredos críticos:
1. **`TokenConfigurations__Secret`**: precisa ter **no mínimo 64 bytes (512 bits)** para assinatura JWT `HS512`.
2. **`SecuritySettings__AesGcmSettings__Key`**: chave simétrica **AES-256 (32 bytes em Base64)** exigida quando `ChecklistProtection__EnableCryptography=true`.

### Gerar via PowerShell (Windows)

```powershell
# 1) TokenConfigurations__Secret (96 bytes em Base64 — > 64 bytes para HS512)
$jwtBytes = New-Object byte[] 96
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($jwtBytes)
Write-Output "TokenConfigurations__Secret=$([Convert]::ToBase64String($jwtBytes))"

# 2) SecuritySettings__AesGcmSettings__Key (32 bytes = 256 bits em Base64 para AES-256-GCM)
$aesBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($aesBytes)
Write-Output "SecuritySettings__AesGcmSettings__Key=$([Convert]::ToBase64String($aesBytes))"
```

### Gerar via Bash / OpenSSL (Linux/macOS)

```bash
# 1) TokenConfigurations__Secret (96 bytes em Base64)
echo "TokenConfigurations__Secret=$(openssl rand -base64 96 | tr -d '\n')"

# 2) SecuritySettings__AesGcmSettings__Key (32 bytes = 256 bits em Base64)
echo "SecuritySettings__AesGcmSettings__Key=$(openssl rand -base64 32 | tr -d '\n')"
```

> [!WARNING]
> **Guarde a chave `SecuritySettings__AesGcmSettings__Key` em cofre seguro (ex.: Azure Key Vault).** Caso essa chave seja alterada ou perdida sem rotação planejada, os checklists já salvos e criptografados em `kink_consent."UserKinkCheclists"` não poderão ser descriptografados.

---

## 3. Passo a Passo no Portal do Azure

1. Acesse o **[Portal do Azure](https://portal.azure.com)** e abra o recurso **App Service** da `KinkConsentManager.API`.
2. No menu lateral esquerdo, expanda **Settings** (Configurações) e clique em **Environment variables** (Variáveis de ambiente).
3. Na aba **App settings** (Configurações de aplicativo):
   - Clique em **+ Add** (Adicionar) para cada variável das tabelas da **Seção 4** (obrigatórias e, se desejado, opcionais).
   - Para cargas rápidas em lote, você também pode clicar em **Advanced edit** (Edição avançada) e colar o JSON de lote (veja modelo na **Seção 5**).
   - Se estiver usando **Deployment Slots** (ex.: `staging` → `production`), marque **Deployment slot setting** apenas para variáveis específicas de cada slot (como `ASPNETCORE_ENVIRONMENT`, `ConnectionStrings__DefaultConnection` e `Cors__AllowedOrigins__0`).
4. *(Alternativa para a string de conexão)* Caso prefira configurar o banco na aba **Connection strings** (Cadeias de conexão) em vez de `App settings`:
   - Clique em **+ Add** → **Name**: `DefaultConnection`, **Value**: string de conexão PostgreSQL do Supabase, **Type**: `PostgreSQL` (ou `Custom`).
   - *Obs.:* configurar `ConnectionStrings__DefaultConnection` diretamente em **App settings** também funciona de forma idêntica no .NET 10.
5. Clique em **Apply** (Aplicar) e depois em **Confirm** (Confirmar) — o App Service reiniciará automaticamente com as novas variáveis.
6. Acompanhe o log de inicialização em **Monitoring → Log stream** para validar o boot sem erros.

---

## 4. Tabelas de Variáveis de Ambiente

### 4.1. Obrigatórias para Produção (Sem valor padrão no `appsettings.json` ou exigem ajuste de ambiente)

Estas variáveis **precisam** ser definidas no App Service para a API subir, conectar ao Supabase, emitir tokens JWT, criptografar os checklists e aceitar requisições do domínio real do frontend:

| Nome da Variável | Valor de Exemplo | Obrigatória | Descrição |
| --- | --- | --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` | Sim | Define o ambiente ASP.NET Core ativo (desativa carregamento de `appsettings.Development.json`). |
| `ConnectionStrings__DefaultConnection` | `Host=aws-0-sa-east-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<PROJECT_REF>;Password=<SENHA_FORTE_SUPABASE>;SSL Mode=Require;Trust Server Certificate=true` | Sim | String de conexão PostgreSQL/Supabase. Pode ser informada aqui ou na aba *Connection strings* com o nome `DefaultConnection`. |
| `TokenConfigurations__Secret` | `<CHAVE_ALEATORIA_BASE64_COM_NO_MINIMO_64_BYTES>` | Sim | Segredo simétrico HS512 para assinatura JWT (**mínimo 64 bytes**; a API falha no startup se estiver ausente ou menor). |
| `SecuritySettings__AesGcmSettings__Key` | `<CHAVE_AES256_32_BYTES_EM_BASE64>` | Sim* | Chave AES-256-GCM usada pelo `SmartCoreHub.Core.SDK` para criptografar `AnswersJson`. *Obrigatória quando `ChecklistProtection__EnableCryptography=true` (padrão).* |
| `Cors__AllowedOrigins__0` | `https://app.seudominio.com` | Sim | Origem principal do frontend Angular em produção autorizada no CORS (sobrescreve `http://localhost:4200`). |
| `Cors__AllowedOrigins__1` | `https://www.seudominio.com` | Não | Origem adicional opcional no CORS (adicione `__2`, `__3`, etc. conforme necessário). |

---

### 4.2. Proteção do Checklist (`SecuritySettings` e `ChecklistProtection`)

Já vêm configuradas com os valores padrão recomendados no [appsettings.json](../../backend/APIs/KinkConsentManager.API/appsettings.json) (**compressão Zstandard + criptografia AES-256-GCM ativadas**). Só é necessário cadastrá-las no App Service caso queira sobrescrever o padrão em runtime (por exemplo, desativar apenas compressão ou apenas criptografia):

| Nome da Variável | Valor de Exemplo (Padrão) | Obrigatória | Descrição |
| --- | --- | --- | --- |
| `SecuritySettings__CryptoType` | `AesGcm` | Não | Provedor padrão do `CryptoService` do `SmartCoreHub.Core.SDK` (`AesGcm`, `Aes`, `Rsa`, `Base64`, `None`). |
| `ChecklistProtection__EnableCompress` | `true` | Não | Flag modular para habilitar/desabilitar a compressão do JSON antes do armazenamento. |
| `ChecklistProtection__EnableCryptography` | `true` | Não | Flag modular para habilitar/desabilitar a criptografia do payload antes do armazenamento. |
| `ChecklistProtection__CryptoAlgorithm` | `AesGcm` | Não | Algoritmo de criptografia aplicado ao checklist (`AesGcm` recomendado — AEAD com integridade e confidencialidade). |
| `ChecklistProtection__CompressionAlgorithm` | `Zstd` | Não | Algoritmo de compressão aplicado antes da criptografia (`Zstd`, `Brotli`, `GZip`, `None`). |
| `ChecklistProtection__CompressionLevel` | `Optimal` | Não | Nível de compressão (`Optimal`, `Fastest`, `SmallestSize`, `NoCompression`). |

---

### 4.3. Banco de Dados e Inicialização

| Nome da Variável | Valor de Exemplo (Padrão) | Obrigatória | Descrição |
| --- | --- | --- | --- |
| `DatabaseProvider` | `PostgreSQL` | Não | Provedor EF Core (`PostgreSQL` ou `INMEMORY`). |
| `Database__SkipInitialization` | `false` | Não | Quando `false`, aplica migrações pendentes no startup. Defina como `true` se as migrations forem executadas exclusivamente via pipeline CI/CD. |

---

### 4.4. Autenticação JWT (`TokenConfigurations`) — Ajustes Opcionais

| Nome da Variável | Valor de Exemplo (Padrão) | Obrigatória | Descrição |
| --- | --- | --- | --- |
| `TokenConfigurations__Issuer` | `KinkConsentManager.API` | Não | Emissor (`iss`) gravado e validado nos tokens JWT. |
| `TokenConfigurations__Audience` | `KinkConsentManager.Client` | Não | Audiência (`aud`) validada nos tokens JWT. |
| `TokenConfigurations__Minutes` | `60` | Não | Tempo de expiração do *Access Token* em minutos. |
| `TokenConfigurations__DaysToExpiry` | `7` | Não | Tempo de expiração do *Refresh Token* em dias. |

---

### 4.5. Persistência de Chaves (`DataProtection`), Localização, Observabilidade e HTTP

| Nome da Variável | Valor de Exemplo | Obrigatória | Descrição |
| --- | --- | --- | --- |
| `DataProtection__KeysPath` | `/home/data-protection-keys` *(Linux)* ou `D:\home\data-protection-keys` *(Windows)* | Recomendada | Diretório persistente no volume `/home` do App Service para manter o anel de chaves do ASP.NET Core Data Protection entre restarts e deploys. |
| `DataProtection__ApplicationName` | `KinkConsentManager` | Não | Nome lógico da aplicação no isolamento de chaves do Data Protection. |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | `InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://brazilsouth-1.in.applicationinsights.azure.com/` | Recomendada | Quando preenchida, habilita telemetria automática via `builder.AddApplicationInsightsIfConfigured()`. |
| `Localization__FunctionalMessages__DefaultCulture` | `en-US` | Não | Cultura padrão das mensagens funcionais da API (`en-US` ou `pt-BR`). |
| `Localization__FunctionalMessages__SupportedCultures__0` | `en-US` | Não | Primeira cultura suportada. |
| `Localization__FunctionalMessages__SupportedCultures__1` | `pt-BR` | Não | Segunda cultura suportada. |
| `Localization__FunctionalMessages__AllowQueryCulture` | `true` | Não | Permite informar cultura via query string (`?culture=pt-BR`) além de `Accept-Language`. |
| `Localization__FunctionalMessages__MissingKeyBehavior` | `ReturnKey` | Não | Comportamento caso uma chave de tradução não seja encontrada. |
| `OpenApiDocumentation__Title` | `KinkConsentManager API` | Não | Título exibido no OpenAPI/Swagger. |
| `OpenApiDocumentation__Description` | `API de autenticação e sincronização em nuvem do KinkConsentManager.` | Não | Descrição exibida no OpenAPI/Swagger. |
| `OpenApiDocumentation__ContactName` | `KinkConsentManager Team` | Não | Nome de contato da documentação OpenAPI. |
| `OpenApiDocumentation__ContactEmail` | `support@seudominio.com` | Não | E-mail de contato da documentação OpenAPI. |
| `Serilog__MinimumLevel__Default` | `Information` | Não | Nível mínimo global de logs (`Information`, `Warning`, `Error`). |
| `Serilog__MinimumLevel__Override__Microsoft` | `Warning` | Não | Nível mínimo de logs do namespace `Microsoft`. |
| `Serilog__MinimumLevel__Override__System` | `Warning` | Não | Nível mínimo de logs do namespace `System`. |
| `Serilog__MinimumLevel__Override__Microsoft.EntityFrameworkCore` | `Error` | Não | Evita verbosidade excessiva de queries SQL no log de produção. |
| `AllowedHosts` | `api.seudominio.com` *(ou `*`)* | Não | Lista de hosts aceitos pelo `HostFilteringMiddleware` (em produção, restrinja ao domínio da API quando possível). |

---

## 5. Exemplo Pronto para Configuração via Azure CLI ou Advanced Edit

### 5.1. Via Azure CLI (`az webapp config appsettings set`)

```bash
az webapp config appsettings set \
  --resource-group "<SEU_RESOURCE_GROUP>" \
  --name "<NOME_DO_APP_SERVICE>" \
  --settings \
    ASPNETCORE_ENVIRONMENT="Production" \
    DatabaseProvider="PostgreSQL" \
    Database__SkipInitialization="false" \
    ConnectionStrings__DefaultConnection="Host=aws-0-sa-east-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<PROJECT_REF>;Password=<SENHA_FORTE>;SSL Mode=Require;Trust Server Certificate=true" \
    TokenConfigurations__Secret="<SEGREDO_JWT_BASE64_MIN_64_BYTES>" \
    SecuritySettings__CryptoType="AesGcm" \
    SecuritySettings__AesGcmSettings__Key="<CHAVE_AES256_BASE64_32_BYTES>" \
    ChecklistProtection__EnableCompress="true" \
    ChecklistProtection__EnableCryptography="true" \
    ChecklistProtection__CryptoAlgorithm="AesGcm" \
    ChecklistProtection__CompressionAlgorithm="Zstd" \
    ChecklistProtection__CompressionLevel="Optimal" \
    Cors__AllowedOrigins__0="https://app.seudominio.com" \
    DataProtection__KeysPath="/home/data-protection-keys" \
    DataProtection__ApplicationName="KinkConsentManager" \
    APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=<GUID>;IngestionEndpoint=https://<REGIAO>.in.applicationinsights.azure.com/"
```

### 5.2. Modelo com Azure Key Vault References (Recomendado em Produção)

1. Habilite a **System-assigned Managed Identity** no App Service (**Settings → Identity → Status: On**).
2. No **Azure Key Vault**, conceda a permissão **Key Vault Secrets User** (RBAC) para a identidade do App Service.
3. Cadastre os 3 segredos no Key Vault (`Kcm-DefaultConnection`, `Kcm-JwtSecret`, `Kcm-AesGcmKey`) e referencie-os no App Service:

| Nome da Variável no App Service | Valor (Key Vault Reference) |
| --- | --- |
| `ConnectionStrings__DefaultConnection` | `@Microsoft.KeyVault(SecretUri=https://<SEU-KEYVAULT>.vault.azure.net/secrets/Kcm-DefaultConnection/)` |
| `TokenConfigurations__Secret` | `@Microsoft.KeyVault(SecretUri=https://<SEU-KEYVAULT>.vault.azure.net/secrets/Kcm-JwtSecret/)` |
| `SecuritySettings__AesGcmSettings__Key` | `@Microsoft.KeyVault(SecretUri=https://<SEU-KEYVAULT>.vault.azure.net/secrets/Kcm-AesGcmKey/)` |

---

## 6. Checklist de Validação Pós-Configuração

1. **Log Stream sem exceção de startup:** confirme em **Monitoring → Log stream** que não há erro `TokenConfigurations:Secret is missing` nem `SecuritySettings:AesGcmSettings:Key is missing`.
2. **Conexão com Supabase:** verifique no log a mensagem `Database initialization completed successfully.` (quando `Database__SkipInitialization=false`).
3. **CORS ativo:** abra o frontend em `https://app.seudominio.com`, faça login e valide no DevTools que as chamadas `POST /api/v1/auth/login` e `PUT /api/v1/checklists/current` retornam `200 OK` sem bloqueio de CORS.
4. **Privacidade em repouso:** após salvar um checklist, consulte a tabela `kink_consent."UserKinkCheclists"` no Supabase e confirme que a coluna `AnswersJson` contém apenas uma string Base64 opaca (`"<base64>"`), sem respostas em texto claro.
