# CI/CD — KinkConsentManager UI

Esta pasta centraliza os pipelines e scripts de **Integração Contínua (CI)** e **Entrega/Implantação Contínua (CD)** do **KinkConsentManager UI**, padronizados a partir da referência `SmartCoreHub-UI.yml`, com suporte multi-plataforma e **desativados por padrão** até ativação explícita.

> **Links relacionados:** [Guia Azure DevOps -> Azure](./GUIA_AZURE_DEVOPS_AZURE.md) · [Guia GitHub Actions -> Azure](./GUIA_GITHUB_ACTIONS_AZURE.md) · [Guia Publicação Manual Azure](./manualdeploy/GUIA_PUBLICACAO_MANUAL_AZURE.md) · [README da Documentação](../docs/README.md) · [Arquitetura](../docs/ARCHITECTURE.md) · [Diretrizes do Projeto](../docs/PROJECT_GUIDELINES.md) · [SonarCloud Config](../frontend/sonar-project.properties) · [Jest Config](../frontend/jest.config.js) · [Dockerfile](../frontend/Dockerfile)

---

## Estrutura da Pasta `ci-cd/`

| Arquivo | Plataforma / Uso | Estado Padrão |
| ------- | ---------------- | ------------- |
| [`GUIA_AZURE_DEVOPS_AZURE.md`](./GUIA_AZURE_DEVOPS_AZURE.md) | Passo a passo completo para Azure DevOps Pipelines (projeto público vs. privado + repositório privado, OIDC, Service Connections, Variable Group e Environment `production`) | Guia de referência |
| [`GUIA_GITHUB_ACTIONS_AZURE.md`](./GUIA_GITHUB_ACTIONS_AZURE.md) | Passo a passo completo de OIDC, Secrets, Environment `production`, SonarCloud e Deploy Azure no GitHub Actions | Guia de referência |
| [`manualdeploy/GUIA_PUBLICACAO_MANUAL_AZURE.md`](./manualdeploy/GUIA_PUBLICACAO_MANUAL_AZURE.md) | Passo a passo de build, ZIP, deploy manual no Azure Portal/CLI, diagnóstico de `default-static-site.js` / `oryx-manifest.toml` e Plano B Node 26 | Guia de referência |
| [`azure-devops/azure-pipelines.yml`](./azure-devops/azure-pipelines.yml) | Azure DevOps Pipelines (`CI_Build_Quality` -> `CD_Docker_Image` / `CD_Deploy_Azure`) | **Desativado** (`trigger: none`, `pr: none`, parâmetros CD `false`) |
| [`github/kinkconsentmanager-ci-cd.yml`](./github/kinkconsentmanager-ci-cd.yml) | GitHub Actions (`ci_build_quality` -> `cd_docker_image` / `cd_deploy_azure`) | **Desativado para CI automático** (`workflow_dispatch` manual; fora de `.github/workflows/`) |
| [`gitlab/.gitlab-ci.yml`](./gitlab/.gitlab-ci.yml) | GitLab CI/CD (JUnit + Cobertura + Sonar + Docker + Azure manual) | **Desativado** (`PIPELINE_ENABLED: "false"`) |
| [`scripts/ci-build-test.sh`](./scripts/ci-build-test.sh) | Script Bash portável (Jenkins, Bitbucket, CircleCI, TeamCity ou execução local) | Sob demanda |

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
| **Imagem Docker** | `leonecr/kinkconsentmanager-ui` (Nginx na porta `80`, healthcheck `/health`, Compose [`dockercompose.prod.yml`](../frontend/dockercompose.prod.yml)) |
| **Projeto SonarCloud** | `sonar.projectKey=lionscorp_kinkconsentmanager-ui` · `sonar.organization=lionscorp` ([`sonar-project.properties`](../frontend/sonar-project.properties)) |

---

## Coleta de Testes Unitários, Cobertura e SonarCloud

O arquivo [`frontend/jest.config.js`](../frontend/jest.config.js) está configurado para gerar, em uma única execução (`npm run test:ci`), todos os formatos exigidos pelos pipelines:

| Formato | Arquivo Gerado | Consumidor |
| ------- | -------------- | ---------- |
| **JUnit XML** | `frontend/coverage/junit/test-results.xml` | `PublishTestResults@2` (Azure DevOps), `dorny/test-reporter@v1` (GitHub), GitLab `reports.junit` |
| **Cobertura XML** | `frontend/coverage/cobertura-coverage.xml` | `ReportGenerator@5` e `PublishCodeCoverageResults@2` (Azure DevOps), GitLab `coverage_report` |
| **LCOV** | `frontend/coverage/lcov.info` | SonarCloud (`sonar.typescript.lcov.reportPaths` / `sonar.javascript.lcov.reportPaths`) |
| **Sonar Test Execution** | `frontend/coverage/sonar/sonar-report.xml` | SonarCloud (`sonar.testExecutionReportPaths`) |

> **Observação técnica:** A referência `SmartCoreHub-UI.yml` passava `test-results.xml` (JUnit) para o `ReportGenerator@5`. Aqui o fluxo foi corrigido para usar `frontend/coverage/cobertura-coverage.xml`, garantindo exibição completa de cobertura por linha e branch no Azure DevOps e GitLab.

---

## Tarefas Importantes Incluídas para Angular SPA + Azure + Docker

1. **Checkout completo (`fetchDepth: 0` / `GIT_DEPTH: "0"`):** Necessário para o SonarCloud analisar *New Code* e histórico de blame corretamente.
2. **Cache determinístico (`npm ci`):** Acelera execuções em `frontend/` preservando o `package-lock.json`.
3. **Empacotamento da pasta correta (`dist/kinkconsentmanager/browser`):** O Angular CLI (`@angular/build:application`) emite os arquivos finais em `browser/`; compactar sem `includeRootFolder` coloca `index.html` diretamente em `/home/site/wwwroot` do Azure Web App.
4. **Startup Command SPA (`--spa`):** Garante fallback de rotas internas do Angular (`/checklist`, `/export`) no Azure Linux App Service sem retornar `404` em refresh direto.
5. **Smoke Test do Container Docker (`/health`):** Antes de fazer `push` da imagem Docker, o pipeline sobe o container localmente e valida `HTTP 200` em `/health` e `/`.
6. **Segurança e Qualidade (SonarCloud + Snyk + `npm audit`):** Quality Gate do SonarCloud, `npm audit --audit-level=high` e suporte opcional ao `SnykSecurityScan@1` / Snyk Action (como na referência `SmartCoreHub-UI.yml`).

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
  - `azureServiceConnection` (Azure Resource Manager Service Connection com acesso ao RG `kinkconsentmanagerrg`)
  - `azureWebAppName` (`kinkconsentmanagerapp`)
  - `AZURE_WEBAPP_URL` (URL pública do Web App para smoke test pós-deploy)

### GitHub Actions (`kinkconsentmanager-ci-cd.yml`)
- **Repository / Environment (`production`) Secrets:**
  - `SONAR_TOKEN`
  - `SNYK_TOKEN` *(opcional)*
  - `DOCKER_USERNAME` e `DOCKER_PASSWORD` *(quando `run_docker_publish=true`)*
  - `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` *(OIDC Federated Credentials no Azure AD / Entra ID para o Environment `production`)*
- **Repository / Environment Variables (`vars`):**
  - `AZURE_WEBAPP_NAME` (padrão `kinkconsentmanagerapp`)
  - `AZURE_WEBAPP_URL` (URL completa `https://...azurewebsites.net`)
  - `DOCKER_REGISTRY` (padrão `docker.io`) e `DOCKER_IMAGE` (padrão `leonecr/kinkconsentmanager-ui`)

---

## Atenção: Workflow QuickDeploy Existente em `.github/workflows/`

O repositório já possui o arquivo [`.github/workflows/main_kinkconsentmanagerapp.yml`](../.github/workflows/main_kinkconsentmanagerapp.yml), gerado automaticamente pelo **Azure Portal QuickDeploy**. Note que ele:
1. Dispara automaticamente a cada push em `main`;
2. Tenta rodar `npm install` na raiz do repositório em vez de `frontend/`;
3. Contém identificadores OIDC diretamente no YAML em vez de usar `${{ secrets.* }}`.

**Recomendação:** Ao ativar o novo pipeline [`github/kinkconsentmanager-ci-cd.yml`](./github/kinkconsentmanager-ci-cd.yml) movendo-o para `.github/workflows/`, migre os dados OIDC para GitHub Secrets e remova ou desative `main_kinkconsentmanagerapp.yml` para evitar conflitos e falhas de build na raiz.
