# CI/CD — KinkConsentManager (Frontend + Backend)

Esta pasta centraliza os pipelines e scripts de **Integração Contínua (CI)** e **Entrega/Implantação Contínua (CD)** do **KinkConsentManager** (**Frontend Angular 22** + **Backend .NET 10**), padronizados a partir do `SmartCoreHub`, com os estágios de **Docker (Frontend e Backend) e Deploy Azure desativados por padrão** até habilitação explícita.

> **Links relacionados:** [Guia Azure DevOps -> Azure](./azure-devops/GUIA_AZURE_DEVOPS_AZURE.md) · [Guia GitHub Actions -> Azure](./github/GUIA_GITHUB_ACTIONS_AZURE.md) · [Guia Publicação Manual Azure](./manualdeploy/GUIA_PUBLICACAO_MANUAL_AZURE.md) · [README da Documentação](../docs/README.md) · [Arquitetura](../docs/ARCHITECTURE.md) · [Diretrizes do Projeto](../docs/PROJECT_GUIDELINES.md) · [SonarCloud Config](../frontend/sonar-project.properties) · [Jest Config](../frontend/jest.config.js) · [Dockerfile Frontend](../frontend/Dockerfile) · [Dockerfile Backend](../backend/APIs/KinkConsentManager.API/Dockerfile)

---

## Estrutura da Pasta `ci-cd/`

| Arquivo | Plataforma / Uso | Estado Padrão |
| ------- | ---------------- | ------------- |
| [`GUIA_AZURE_DEVOPS_AZURE.md`](./azure-devops/GUIA_AZURE_DEVOPS_AZURE.md) | Passo a passo completo para Azure DevOps Pipelines (projeto público vs. privado + repositório privado, OIDC, Service Connections, Variable Group e Environment `production`) | Guia de referência |
| [`GUIA_GITHUB_ACTIONS_AZURE.md`](./github/GUIA_GITHUB_ACTIONS_AZURE.md) | Passo a passo completo de OIDC, Secrets, Environment `production`, SonarCloud e Deploy Azure no GitHub Actions | Guia de referência |
| [`manualdeploy/GUIA_PUBLICACAO_MANUAL_AZURE.md`](./manualdeploy/GUIA_PUBLICACAO_MANUAL_AZURE.md) | Passo a passo de build, ZIP, deploy manual no Azure Portal/CLI, diagnóstico de `default-static-site.js` / `oryx-manifest.toml` e Plano B Node 26 | Guia de referência |
| [`azure-devops/azure-pipelines.yml`](./azure-devops/azure-pipelines.yml) | Azure DevOps Pipelines (`CI_Build_Quality` Frontend + Backend -> `CD_Docker_Image` / `CD_Docker_Image_Backend` / `CD_Deploy_Azure`) | **CI ativo em `main`; Docker Frontend/Backend e Deploy `false`** |
| [`github/kinkconsentmanager-ci-cd.yml`](./github/kinkconsentmanager-ci-cd.yml) | GitHub Actions (`ci_build_quality` + `ci_backend_build_test` -> `cd_docker_image` / `cd_backend_docker_image` / `cd_deploy_azure`) | **CI automático comentado (`workflow_dispatch`); Docker Frontend/Backend `false`** |
| [`gitlab/.gitlab-ci.yml`](./gitlab/.gitlab-ci.yml) | GitLab CI/CD (Frontend + Backend .NET 10 + Cobertura + Sonar + Docker Frontend/Backend desativados + Azure manual) | **Desativado** (`PIPELINE_ENABLED: "false"`) |
| [`scripts/ci-build-test.sh`](./scripts/ci-build-test.sh) | Script Bash portável para Frontend e Backend (`RUN_BACKEND_DOCKER=false` por padrão) | Sob demanda |

---

## Alvo Atual de Infraestrutura (Azure & Docker)

Baseado no App Service provisionado e nos arquivos de container em [`frontend/`](../frontend):

| Recurso | Valor Configurado / Referência |
| ------- | ------------------------------ |
| **Azure Web App** | `kinkconsentmanagerapp` |
| **Resource Group** | `kinkconsentmanagerrg` |
| **Região / Plano / SO** | `Brazil South` · `F1 Free` · `Linux` |
| **Runtime Azure** | `NODE\|24-lts` (alinhado ao `node:24-alpine` do [`Dockerfile`](../frontend/Dockerfile)) |
| **Comando de Startup SPA (Azure Linux)** | `pm2 serve /home/site/wwwroot --no-daemon --spa` |
| **Pacote de Deploy SPA** | Conteúdo direto de `frontend/dist/kinkconsentmanager/browser/` (sem subpasta raiz no `.zip`) |
| **Imagem Docker (Frontend)** | `leonecr/kinkconsentmanager-ui` (Nginx na porta `80`, healthcheck `/health`, Compose [`dockercompose.prod.yml`](../frontend/dockercompose.prod.yml) — CD desativado por padrão) |
| **Runtime & Solution Backend** | `.NET 10` (`net10.0`, SDK `10.0.x`), [`KinkConsentManager.sln`](../backend/KinkConsentManager.sln) (4 projetos: `API`, `API.Tests`, `Core`, `Core.Tests`) |
| **Modo 1 — Publicação Tradicional Backend (ZIP)** | `dotnet publish ... /p:UseAppHost=false` gerando `kinkconsentmanager-api*.zip` com `KinkConsentManager.API.dll`, `web.config` e `appsettings.json` na raiz do ZIP para Azure Web App `kinkconsentmanagerappapi` (`Windows`, `F1 Free`, `Brazil South`, `.NET 10 (LTS)`, Application Insights `kinkconsentmanagerappapi`, URL `https://kinkconsentmanagerappapi-b7eaezc7cbhxftfb.brazilsouth-01.azurewebsites.net` — CD desativado por padrão) |
| **Modo 2 — Imagem Docker (Backend)** | `leonecr/kinkconsentmanager-api` (ASP.NET Core 10 na porta `8080`, healthcheck `/health`, Compose [`docker-compose.prod.yml`](../backend/APIs/KinkConsentManager.API/docker-compose.prod.yml) — **CD desativado por padrão**) |
| **Projeto SonarCloud** | `sonar.projectKey=lionscorp_kinkconsentmanager-ui` · `sonar.organization=lionscorp` ([`sonar-project.properties`](../frontend/sonar-project.properties)) |

---

## Coleta de Testes Unitários, Cobertura e SonarCloud

O arquivo [`frontend/jest.config.js`](../frontend/jest.config.js) (Frontend) e a solution [`backend/KinkConsentManager.sln`](../backend/KinkConsentManager.sln) (Backend NUnit + Coverlet) geram os relatórios exigidos pelos pipelines:

| Stack | Formato | Arquivo Gerado | Consumidor |
| ----- | ------- | -------------- | ---------- |
| **Frontend** | **JUnit XML** | `frontend/coverage/junit/test-results.xml` | `PublishTestResults@2` (Azure DevOps), `dorny/test-reporter@v1` (GitHub), GitLab `reports.junit` |
| **Frontend** | **Cobertura XML** | `frontend/coverage/cobertura-coverage.xml` | `ReportGenerator@5` e `PublishCodeCoverageResults@2` (Azure DevOps), GitLab `coverage_report` |
| **Frontend** | **LCOV** | `frontend/coverage/lcov.info` | SonarCloud (`sonar.typescript.lcov.reportPaths` / `sonar.javascript.lcov.reportPaths`) |
| **Frontend** | **Sonar Test Execution** | `frontend/coverage/sonar/sonar-report.xml` | SonarCloud (`sonar.testExecutionReportPaths`) |
| **Backend** | **TRX (VSTest)** | `backend/TestResults/**/test-results*.trx` | `PublishTestResults@2` (Azure DevOps `VSTest`), `dorny/test-reporter@v1` (`dotnet-trx` no GitHub) |
| **Backend** | **Cobertura XML** | `backend/TestResults/**/coverage.cobertura.xml` | `ReportGenerator@5` + `PublishCodeCoverageResults@2` (Azure DevOps), GitLab `coverage_report` |

> **Observação técnica:** A referência `SmartCoreHub-UI.yml` passava `test-results.xml` (JUnit) para o `ReportGenerator@5`. Aqui o fluxo foi corrigido para usar `frontend/coverage/cobertura-coverage.xml`, garantindo exibição completa de cobertura por linha e branch no Azure DevOps e GitLab.

---

## Tarefas Importantes Incluídas para Angular SPA + Azure + Docker

1. **Checkout completo (`fetchDepth: 0` / `GIT_DEPTH: "0"`):** Necessário para o SonarCloud analisar *New Code* e histórico de blame corretamente.
2. **Cache determinístico (`npm ci`):** Acelera execuções em `frontend/` preservando o `package-lock.json`.
3. **Empacotamento da pasta correta (`dist/kinkconsentmanager/browser`):** O Angular CLI (`@angular/build:application`) emite os arquivos finais em `browser/`; compactar sem `includeRootFolder` coloca `index.html` diretamente em `/home/site/wwwroot` do Azure Web App.
4. **Startup Command SPA (`--spa`):** Garante fallback de rotas internas do Angular (`/checklist`, `/export`) no Azure Linux App Service sem retornar `404` em refresh direto.
5. **Smoke Test do Container Docker (`/health`):** Antes de fazer `push` da imagem Docker, o pipeline sobe o container localmente e valida `HTTP 200` em `/health` e `/`.
6. **Segurança, Quality Gate e Bloqueio Estrito Pós-Testes:** Se qualquer teste unitário/integração falhar no **Frontend** (`jest --ci`) ou no **Backend** (`dotnet test`), os pipelines publicam apenas o resumo de testes JUnit/TRX para diagnóstico e **bloqueiam** automaticamente a execução do SonarCloud, a geração/upload dos pacotes `.zip` de deploy e todos os estágios de CD (Docker / Azure Web App). O mesmo bloqueio vale se o Quality Gate do SonarCloud reprovar.

---

## Regras de Branch Única (`main`) e Aprovação Obrigatória no Deploy

Como o repositório possui atualmente **uma única branch (`main`)**, o controle de segurança antes de publicar em produção é garantido em três camadas:

1. **Parâmetros / Inputs Opt-in (`false` por padrão):** Os estágios `CD_Docker_Image` e `CD_Deploy_Azure` não rodam sem habilitação explícita.
2. **Condição de Branch (`refs/heads/main`):** Os jobs de CD validam que a execução ocorreu exclusivamente em `main`.
3. **Environment `production` com Aprovação Humana:**
   - **Azure DevOps:** Em **Pipelines -> Environments -> `production` -> Approvals and checks**, adicione:
     - **Approvals:** Lista de aprovadores obrigatórios antes do job `DeployAzureWebApp`.
     - **Branch control:** Allowed branches = `refs/heads/main`.
   - **GitHub Actions:** Em **Settings -> Environments -> `production`**, configure:
     - **Required reviewers:** Selecione os revisores que aprovarão o deploy.
     - **Deployment branches and tags:** Selecione **Selected branches and tags** e adicione `main`.

---

## Credenciais, Service Connections e Variáveis (Sem Segredos no Código)

Nenhum GUID de assinatura, Client ID, Tenant ID ou token foi fixado nos arquivos YAML. Configure-os nos cofres de cada plataforma:

### Azure DevOps (`azure-pipelines.yml`)
- **Variable Group:** `kinkconsentmanager-ci-vars`
  - `sonarCloudServiceConnection` (nome da Service Connection do SonarCloud)
  - `sonarOrganization` (`lionscorp`)
  - `snykServiceConnection` (opcional, se `enableSnykScan=true`)
  - `dockerRegistryServiceConnection` (Service Connection Docker Hub / ACR)
  - `dockerImageRepository` (`leonecr/kinkconsentmanager-ui`)
  - `backendDockerImageRepository` (`leonecr/kinkconsentmanager-api` — usado apenas se `enableBackendDockerPublish=true`)
  - `azureServiceConnection` (Azure Resource Manager Service Connection com acesso ao RG `kinkconsentmanagerrg`)
  - **App Service Frontend** *(sobrescrevem os defaults do YAML se cadastradas no Variable Group)*:
    - `azureWebAppName` (default `kinkconsentmanagerapp`)
    - `azureWebAppType` (default `webAppLinux`)
    - `azureWebAppRuntimeStack` (default `NODE|24-lts`)
    - `azureStartupCommand` (default `pm2 serve /home/site/wwwroot --no-daemon --spa`)
    - `azureWebAppDeploymentMethod` (default `auto`)
    - `azureWebAppUrl` (default `https://kinkconsentmanagerapp.azurewebsites.net`)
  - **App Service Backend** *(sobrescrevem os defaults do YAML se cadastradas no Variable Group)*:
    - `azureBackendWebAppName` (default `kinkconsentmanagerappapi`)
    - `azureBackendWebAppType` (default `webApp` para Windows; use `webAppLinux` se migrar para Linux)
    - `azureBackendRuntimeStack` (default `''` em Windows; ex. `DOTNETCORE|10.0` em Linux)
    - `azureBackendStartupCommand` (default `''` em Windows; ex. `dotnet KinkConsentManager.API.dll` em Linux)
    - `azureBackendDeploymentMethod` (default `auto`)
    - `azureBackendWebAppUrl` (default `https://kinkconsentmanagerappapi-b7eaezc7cbhxftfb.brazilsouth-01.azurewebsites.net`)
  - `AZURE_WEBAPP_URL` e `AZURE_BACKEND_WEBAPP_URL` *(opcionais — precedência no script de smoke test sobre `azureWebAppUrl`/`azureBackendWebAppUrl`)*

### GitHub Actions (`kinkconsentmanager-ci-cd.yml`)
- **Repository / Environment (`production`) Secrets:**
  - `SONAR_TOKEN`
  - `SNYK_TOKEN` *(opcional)*
  - `DOCKER_USERNAME` e `DOCKER_PASSWORD` *(quando `run_docker_publish=true` ou `run_backend_docker_publish=true`)*
  - `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` *(OIDC Federated Credentials no Azure AD / Entra ID para o Environment `production`)*
- **Repository / Environment Variables (`vars`):**
  - `AZURE_WEBAPP_NAME` (padrão `kinkconsentmanagerapp`) e `AZURE_BACKEND_WEBAPP_NAME` (padrão `kinkconsentmanagerappapi`)
  - `AZURE_WEBAPP_URL` e `AZURE_BACKEND_WEBAPP_URL` (URLs completas `https://...azurewebsites.net`)
  - `DOCKER_REGISTRY` (padrão `docker.io`), `DOCKER_IMAGE` (padrão `leonecr/kinkconsentmanager-ui`) e `BACKEND_DOCKER_IMAGE` (padrão `leonecr/kinkconsentmanager-api`)

### Geração Manual do Pacote `.zip` Tradicional do Backend (PowerShell)
```powershell
dotnet publish backend\APIs\KinkConsentManager.API\KinkConsentManager.API.csproj -c Release /p:UseAppHost=false -o backend\publish\api
Compress-Archive -Path backend\publish\api\* -DestinationPath ci-cd\out\kinkconsentmanager-api.zip -Force
```
*(Em Linux/macOS, utilize `(cd backend/publish/api && zip -rq ../../ci-cd/out/kinkconsentmanager-api.zip .)` para manter `KinkConsentManager.API.dll` e `appsettings.json` na raiz do `.zip`.)*

---

## Sincronização em `.github/workflows/`

O workflow [`github/kinkconsentmanager-ci-cd.yml`](./github/kinkconsentmanager-ci-cd.yml) encontra-se espelhado em [`.github/workflows/kinkconsentmanager-ci-cd.yml`](../.github/workflows/kinkconsentmanager-ci-cd.yml) com disparo apenas manual (`workflow_dispatch`). Caso seja adicionado no futuro um workflow gerado pelo Azure Portal QuickDeploy (`main_kinkconsentmanagerapp.yml`), remova-o ou desative-o para evitar conflitos de execução na raiz.
