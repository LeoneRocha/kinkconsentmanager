# Guia de Configuração — Variable Group `kinkconsentmanager-ci-vars` (Azure DevOps)

Este documento descreve exclusivamente como criar, autorizar e manter o Variable Group **`kinkconsentmanager-ci-vars`** utilizado pelo pipeline [`azure-pipelines.yml`](./azure-pipelines.yml).

> **Links rápidos:** [Guia Completo Azure DevOps -> Azure](./GUIA_AZURE_DEVOPS_AZURE.md) · [Pipeline `azure-pipelines.yml`](./azure-pipelines.yml) · [Visão Geral `ci-cd/README.md`](../README.md) · [SonarCloud Config](../../frontend/sonar-project.properties)

---

## 1. Como Criar e Autorizar no Azure DevOps

O arquivo [`azure-pipelines.yml`](./azure-pipelines.yml) declara `- group: kinkconsentmanager-ci-vars` dentro do bloco `variables:`. Sem esse grupo criado e autorizado, o Azure DevOps bloqueia o início da execução.

1. No projeto do Azure DevOps, acesse **Pipelines → Library → + Variable group**.
2. Em **Variable group name**, informe exatamente:
   ```text
   kinkconsentmanager-ci-vars
   ```
3. Adicione as variáveis desejadas conforme as seções da **Referência Completa** abaixo e clique em **Save**.
4. *(Permissão)* Ao criar ou editar o pipeline, acesse **Pipelines → Library → `kinkconsentmanager-ci-vars` → Pipeline permissions** e autorize o pipeline `KinkConsentManager-CI-CD` (ou clique em **View → Permit** na primeira execução).

---

## 2. Regras de Precedência (Como o YAML Resolve as Variáveis)

Existem **dois mecanismos** de precedência no [`azure-pipelines.yml`](./azure-pipelines.yml):

1. **Defaults declarados antes de `- group: kinkconsentmanager-ci-vars`** *(Infraestrutura, App Service Frontend/Backend, Docker, SonarCloud e Caminhos)*:
   - Todas as 22 variáveis padrão vêm declaradas no YAML **antes** de `- group: kinkconsentmanager-ci-vars`.
   - Qualquer variável de mesmo nome cadastrada no `kinkconsentmanager-ci-vars` (ou nas variáveis da UI da Pipeline) **sobrescreve automaticamente** o default do YAML.
   - Se você **não** cadastrá-la no Variable Group, o valor padrão do YAML é utilizado sem erro.

2. **Variáveis de Controle / Flags (`resolved*`)**:
   - Resolvidas via expressão `$[ coalesce(variables['<variavel>'], '${{ parameters.<variavel> }}') ]`.
   - Ordem final: **Variável em `kinkconsentmanager-ci-vars` / Pipeline UI → Parâmetro escolhido na tela *Run pipeline* → Default do parâmetro**.
   - **Dica:** Se quiser ligar/desligar deploys, Docker ou SonarCloud manualmente a cada execução pela tela **Run pipeline**, **não** cadastre essas flags no Variable Group (pois a variável cadastrada no grupo sempre prevalece sobre o checkbox do *Run pipeline*).

> **Atenção — Validação de Service Connections no início do Run:**
> Mesmo quando `enableSonarCloud` e `enableSnykScan` estão em `false`, o Azure DevOps valida na inicialização do job se `sonarCloudServiceConnection` e `snykServiceConnection` apontam para Service Connections existentes. Mantenha ambas cadastradas com nomes válidos (ou substitua por conexões válidas do projeto).

---

## 3. Referência Completa de Todas as Variáveis

### 3.1 Service Connections

| Nome da Variável | Obrigatória Cadastrar? | Exemplo de Valor | Secret? | Finalidade |
| --- | --- | --- | --- | --- |
| `azureServiceConnection` | Sim *(para CD Azure)* | `azure-kinkconsentmanager-oidc` | Não | Service Connection Azure Resource Manager (OIDC) usada pela task `AzureWebApp@1` (Frontend e Backend) |
| `sonarCloudServiceConnection` | **Sim** | `SonarCloud` | Não | Nome da Service Connection do SonarCloud usada por `SonarCloudPrepare@3` |
| `snykServiceConnection` | **Sim** | `Snyk` | Não | Nome da Service Connection do Snyk usada por `SnykSecurityScan@1` |
| `dockerRegistryServiceConnection` | Não *(só se publicar Docker)* | `dockerhub-leonecr` | Não | Service Connection Docker Hub / ACR usada em `Docker@2` (`push`) |

### 3.2 Controle / Flags de Execução (Parâmetros Sobrescrevíveis)

| Nome da Variável | Default do Parâmetro | Obrigatória Cadastrar? | Finalidade |
| --- | --- | --- | --- |
| `nodeVersion` | `24.x` | Não *(Opcional)* | Versão do Node.js instalada por `NodeTool@0` no Frontend |
| `dotnetVersion` | `10.0.x` | Não *(Opcional)* | Versão do .NET SDK instalada por `UseDotNet@2` no Backend |
| `useLegacyPeerDeps` | `true` | Não *(Opcional)* | `true` executa `npm ci --legacy-peer-deps`; `false` executa `npm ci` |
| `enableSonarCloud` | `false` | Não *(Opcional)* | Habilita preparação, análise e Quality Gate no SonarCloud (`Frontend`) |
| `enableSnykScan` | `false` | Não *(Opcional)* | Habilita varredura de vulnerabilidades com `SnykSecurityScan@1` |
| `enableDockerPublish` | `false` | Não *(Opcional)* | Habilita estágio `CD_Docker_Image` (Docker Frontend na branch `main`) |
| `enableBackendDockerPublish` | `false` | Não *(Opcional)* | Habilita estágio `CD_Docker_Image_Backend` (Docker Backend na branch `main`) |
| `enableAzureDeploy` | `false` | Não *(Opcional)* | Habilita estágio `CD_Deploy_Azure` (Deploy SPA Frontend no Azure na branch `main`) |
| `enableBackendAzureDeploy` | `false` | Não *(Opcional)* | Habilita estágio `CD_Deploy_Azure_Backend` (Deploy ZIP API Backend no Azure na branch `main`) |

### 3.3 App Service Frontend (`CD_Deploy_Azure`)

| Nome da Variável | Valor Padrão no YAML | Obrigatória Cadastrar? | Finalidade |
| --- | --- | --- | --- |
| `azureWebAppName` | `kinkconsentmanagerapp` | Não *(Opcional)* | Nome do Web App Frontend no Azure |
| `azureWebAppType` | `webAppLinux` | Não *(Opcional)* | Tipo na task `AzureWebApp@1` (`webAppLinux` ou `webApp`) |
| `azureWebAppRuntimeStack` | `NODE\|24-lts` | Não *(Opcional)* | Stack de runtime Linux aplicado ao App Service Frontend |
| `azureStartupCommand` | `pm2 serve /home/site/wwwroot --no-daemon --spa` | Não *(Opcional)* | Comando de startup SPA para fallback de rotas Angular no Linux |
| `azureWebAppDeploymentMethod` | `auto` | Não *(Opcional)* | Método de deploy da task `AzureWebApp@1` (`auto`, `zipDeploy`, etc.) |
| `azureWebAppUrl` | `https://kinkconsentmanagerapp.azurewebsites.net` | Não *(Opcional)* | URL padrão do Frontend para o smoke test HTTP pós-deploy |
| `AZURE_WEBAPP_URL` | *(fallback para `azureWebAppUrl`)* | Não *(Opcional)* | Variável de ambiente lida prioritariamente no script de smoke test (`${AZURE_WEBAPP_URL:-$(azureWebAppUrl)}`) |

### 3.4 App Service Backend (`CD_Deploy_Azure_Backend`)

| Nome da Variável | Valor Padrão no YAML | Obrigatória Cadastrar? | Finalidade |
| --- | --- | --- | --- |
| `azureBackendWebAppName` | `kinkconsentmanagerappapi` | Não *(Opcional)* | Nome do Web App Backend no Azure |
| `azureBackendWebAppType` | `webApp` | Não *(Opcional)* | Tipo na task `AzureWebApp@1` (`webApp` para Windows; `webAppLinux` para Linux) |
| `azureBackendRuntimeStack` | `''` *(vazio)* | Não *(Opcional)* | Runtime Stack (vazio em Windows/IIS; ex.: `DOTNETCORE\|10.0` em Linux) |
| `azureBackendStartupCommand` | `''` *(vazio)* | Não *(Opcional)* | Startup command (vazio em Windows/IIS; ex.: `dotnet KinkConsentManager.API.dll` em Linux) |
| `azureBackendDeploymentMethod` | `auto` | Não *(Opcional)* | Método de deploy da task `AzureWebApp@1` (`auto`, `zipDeploy`, etc.) |
| `azureBackendWebAppUrl` | `https://kinkconsentmanagerappapi-b7eaezc7cbhxftfb.brazilsouth-01.azurewebsites.net` | Não *(Opcional)* | URL padrão do Backend para o smoke test `/health` pós-deploy |
| `AZURE_BACKEND_WEBAPP_URL` | *(fallback para `azureBackendWebAppUrl`)* | Não *(Opcional)* | Variável de ambiente lida prioritariamente no script de smoke test (`${AZURE_BACKEND_WEBAPP_URL:-$(azureBackendWebAppUrl)}`) |

### 3.5 SonarCloud & Imagens Docker

| Nome da Variável | Valor Padrão no YAML | Obrigatória Cadastrar? | Finalidade |
| --- | --- | --- | --- |
| `sonarOrganization` | `lionscorp` | Não *(Opcional)* | Organização do SonarCloud passada a `SonarCloudPrepare@3` |
| `dockerImageRepository` | `leonecr/kinkconsentmanager-ui` | Não *(Opcional)* | Repositório da imagem Docker do Frontend em `CD_Docker_Image` |
| `backendDockerImageRepository` | `leonecr/kinkconsentmanager-api` | Não *(Opcional)* | Repositório da imagem Docker do Backend em `CD_Docker_Image_Backend` |

### 3.6 Caminhos de Build & Pastas de Cache

| Nome da Variável | Valor Padrão no YAML | Obrigatória Cadastrar? | Finalidade |
| --- | --- | --- | --- |
| `frontendDir` | `$(Build.SourcesDirectory)/frontend` | Não *(Opcional)* | Diretório de trabalho do Angular e Jest |
| `distBrowserDir` | `$(Build.SourcesDirectory)/frontend/dist/kinkconsentmanager/browser` | Não *(Opcional)* | Pasta do bundle SPA validada e compactada no artefato `drop-webapp` |
| `backendDir` | `$(Build.SourcesDirectory)/backend` | Não *(Opcional)* | Diretório raiz do Backend (.NET 10) e contexto de build Docker |
| `backendSln` | `$(Build.SourcesDirectory)/backend/KinkConsentManager.sln` | Não *(Opcional)* | Caminho da solution usada em `restore`, `build` e `test` |
| `backendApiProject` | `$(Build.SourcesDirectory)/backend/APIs/KinkConsentManager.API/KinkConsentManager.API.csproj` | Não *(Opcional)* | Projeto `.csproj` publicado via `dotnet publish` e empacotado em `drop-backend-api` |
| `npmCacheFolder` | `$(Pipeline.Workspace)/.npm` | Não *(Opcional)* | Pasta de cache do npm (`Cache@2` + `NPM_CONFIG_CACHE`) |
| `nugetCacheFolder` | `$(Pipeline.Workspace)/.nuget/packages` | Não *(Opcional)* | Pasta de cache do NuGet (`Cache@2` + `NUGET_PACKAGES`) |

### 3.7 Variáveis Internas Resolvidas em Runtime (**Não cadastrar**)

Calculadas pelo YAML após carregar `- group: kinkconsentmanager-ci-vars` e propagadas via outputs dos jobs `ResolveCdFlags` e `ResolveBackendCdFlags` para os estágios de CD:

| Variável Interna | Expressão de Resolução | Consumidor |
| --- | --- | --- |
| `resolvedNodeVersion` | `$[ coalesce(variables['nodeVersion'], '${{ parameters.nodeVersion }}') ]` | `NodeTool@0` (Frontend) |
| `resolvedDotnetVersion` | `$[ coalesce(variables['dotnetVersion'], '${{ parameters.dotnetVersion }}') ]` | `UseDotNet@2` (Backend) |
| `resolvedUseLegacyPeerDeps` | `$[ coalesce(variables['useLegacyPeerDeps'], '${{ parameters.useLegacyPeerDeps }}') ]` | `Npm@1` (`ci` vs `ci --legacy-peer-deps`) |
| `resolvedEnableSonarCloud` | `$[ coalesce(variables['enableSonarCloud'], '${{ parameters.enableSonarCloud }}') ]` | `SonarCloudPrepare@3`, `SonarCloudAnalyze@3`, `SonarCloudPublish@3` |
| `resolvedEnableSnykScan` | `$[ coalesce(variables['enableSnykScan'], '${{ parameters.enableSnykScan }}') ]` | `SnykSecurityScan@1` |
| `resolvedEnableDockerPublish` | `$[ coalesce(variables['enableDockerPublish'], '${{ parameters.enableDockerPublish }}') ]` | `ResolveCdFlags` → Estágio `CD_Docker_Image` |
| `resolvedEnableBackendDockerPublish` | `$[ coalesce(variables['enableBackendDockerPublish'], '${{ parameters.enableBackendDockerPublish }}') ]` | `ResolveBackendCdFlags` → Estágio `CD_Docker_Image_Backend` |
| `resolvedEnableAzureDeploy` | `$[ coalesce(variables['enableAzureDeploy'], '${{ parameters.enableAzureDeploy }}') ]` | `ResolveCdFlags` → Estágio `CD_Deploy_Azure` |
| `resolvedEnableBackendAzureDeploy` | `$[ coalesce(variables['enableBackendAzureDeploy'], '${{ parameters.enableBackendAzureDeploy }}') ]` | `ResolveBackendCdFlags` → Estágio `CD_Deploy_Azure_Backend` |

---

## 4. Receitas Prontas de Configuração

### Receita A — Mínimo Necessário para Rodar CI (Build + Testes + Artefatos)
Cadastre apenas as Service Connections obrigatórias para validação do YAML (os 22 defaults de infraestrutura/caminhos vêm prontos do YAML e as flags ficam livres para marcar na tela *Run pipeline*):
- `azureServiceConnection` = `<nome-da-sua-service-connection-azure>`
- `sonarCloudServiceConnection` = `<nome-da-sua-service-connection-sonar>`
- `snykServiceConnection` = `<nome-da-sua-service-connection-snyk>`

### Receita B — Deploy Automático (com Aprovação) do Frontend + Backend Windows já Provisionados
Adicione ou ajuste no Variable Group (ou marque na tela *Run pipeline* apenas os toggles):
- `azureServiceConnection` = `<nome-da-sua-service-connection-azure>`
- `azureWebAppName` = `kinkconsentmanagerapp` *(já é default)*
- `azureWebAppUrl` = `https://kinkconsentmanagerapp.azurewebsites.net` *(já é default)*
- `azureBackendWebAppName` = `kinkconsentmanagerappapi` *(já é default)*
- `azureBackendWebAppType` = `webApp` *(já é default — Windows)*
- `azureBackendWebAppUrl` = `https://kinkconsentmanagerappapi-b7eaezc7cbhxftfb.brazilsouth-01.azurewebsites.net` *(já é default)*
- `enableAzureDeploy` = `true` *(ou deixe fora do grupo para marcar no Run)*
- `enableBackendAzureDeploy` = `true` *(ou deixe fora do grupo para marcar no Run)*

### Receita C — Se Migrar o App Service Backend de Windows para Linux no Futuro
Altere apenas estas variáveis no `kinkconsentmanager-ci-vars`, sem precisar editar [`azure-pipelines.yml`](./azure-pipelines.yml):
- `azureBackendWebAppType` = `webAppLinux`
- `azureBackendRuntimeStack` = `DOTNETCORE|10.0`
- `azureBackendStartupCommand` = `dotnet KinkConsentManager.API.dll`
