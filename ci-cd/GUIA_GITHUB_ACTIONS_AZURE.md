# Guia Passo a Passo — Configurar CI/CD no GitHub Actions para o Azure App Service (`kinkconsentmanagerapp`)

Este guia detalha tudo o que você precisa fazer no **Azure Portal**, no **Microsoft Entra ID (Azure AD)**, no **SonarCloud** e no **GitHub** para habilitar o pipeline [`kinkconsentmanager-ci-cd.yml`](./github/kinkconsentmanager-ci-cd.yml) com:

- Build Angular 22 (`npm run build:prod`) + Testes Jest 30 + Cobertura (`Cobertura`, `LCOV`, `JUnit`, `Sonar`);
- Análise e Quality Gate no **SonarCloud**;
- Estágio separado opcional de **Docker Build + Smoke Test (`/health`) + Push**;
- Deploy no **Azure App Service Linux (`kinkconsentmanagerapp`)** protegido por **aprovação humana obrigatória** e regra de **branch única `main`**.

> **Links rápidos:** [Visão Geral `ci-cd/README.md`](./README.md) · [Workflow GitHub Actions](./github/kinkconsentmanager-ci-cd.yml) · [SonarCloud Config](../frontend/sonar-project.properties) · [Documentação Central](../docs/README.md)

---

## Arquitetura do Pipeline no GitHub Actions

```text
  [workflow_dispatch / main]
             │
             ▼
  1. ci_build_quality
     ├── npm ci (em frontend/)
     ├── npm audit + Snyk (opcional)
     ├── npm run build:prod  ──► frontend/dist/kinkconsentmanager/browser/
     ├── npm run test:ci     ──► JUnit + Cobertura + LCOV + Sonar XML
     ├── SonarCloud Scan + Quality Gate
     └── Upload artifacts: webapp-dist · frontend-coverage-reports · docker-compose-prod
             │
             ├──► 2. cd_docker_image (se branch == main E run_docker_publish == true)
             │       └── Docker Build -> Smoke Test (/health) -> Docker Push
             │
             └──► 3. cd_deploy_azure (se branch == main E run_azure_deploy == true)
                     ├── Gate: Environment `production` (Aprovação manual obrigatória)
                     ├── Autenticação Azure OIDC (sem senha fixa)
                     └── azure/webapps-deploy@v3 -> kinkconsentmanagerapp (Production)
```

---

## Passo 1 — Configurar o Startup Command SPA no Azure App Service

Sem um comando de inicialização no Azure App Service Linux (Node), o container executa `node /opt/startup/default-static-site.js` e exibe apenas a página padrão do Azure, ignorando o bundle Angular.

1. Acesse o **Portal do Azure** e abra o Web App **`kinkconsentmanagerapp`** (Resource Group **`kinkconsentmanagerrg`**).
2. No menu lateral esquerdo, vá em **Configurações (Settings) → Configuração (Configuration) → Configurações gerais (General settings)**.
3. Em **Comando de inicialização (Startup Command)**, preencha exatamente:
   ```bash
   pm2 serve /home/site/wwwroot --no-daemon --spa
   ```
   > O parâmetro `--spa` redireciona rotas internas do Angular (`/checklist`, `/export`) para `index.html`, evitando erro `404` ao recarregar páginas no navegador.
4. Clique em **Salvar (Save)** no topo e confirme o reinício.

---

## Passo 2 — Configurar Autenticação OIDC (Federated Credentials) no Azure

O workflow usa **OIDC (OpenID Connect)** via `azure/login@v2`, eliminando segredos/senhas expirando e garantindo autenticação segura do GitHub para o Azure.

### 2.1 Criar (ou reutilizar) o App Registration no Microsoft Entra ID
1. No Portal do Azure, acesse **Microsoft Entra ID → Registros de aplicativo (App registrations)**.
2. Se já existir um registro criado pelo QuickDeploy para `kinkconsentmanagerapp`, abra-o; caso contrário, clique em **Novo registro (New registration)** (ex.: `github-kinkconsentmanager-cd`) e clique em **Registrar**.
3. Na tela **Visão geral (Overview)** do App Registration, anote:
   - **ID do aplicativo (cliente)** → será seu secret `AZURE_CLIENT_ID`
   - **ID do diretório (locatário)** → será seu secret `AZURE_TENANT_ID`
4. Na tela de **Assinaturas (Subscriptions)** do Azure, anote o **ID da assinatura** → será seu secret `AZURE_SUBSCRIPTION_ID`.

### 2.2 Adicionar Credencial Federada (Federated Credential) ligada ao Environment `production`
> **ATENÇÃO CRÍTICA:** Como o job `cd_deploy_azure` usa `environment: production`, o token OIDC enviado pelo GitHub possui o `subject` do **Environment** (`repo:<DONO>/<REPOSITORIO>:environment:production`), **NÃO** o da branch (`ref:refs/heads/main`). Se a credencial federada estiver apontando só para branch, o login falhará com **`AADSTS70021`**.

1. Dentro do App Registration, vá em **Certificados e segredos (Certificates & secrets) → Credenciais federadas (Federated credentials) → + Adicionar credencial (+ Add credential)**.
2. Em **Cenário de credencial federada**, selecione **GitHub Actions deploying Azure resources**.
3. Preencha:
   - **Organização (Organization):** `<SEU_USUARIO_OU_ORG_GITHUB>`
   - **Repositório (Repository):** `<NOME_DO_REPOSITORIO>` (ex.: `kinkconsentmanager`)
   - **Tipo de entidade (Entity type):** selecione **`Environment`**
   - **Nome do ambiente GitHub:** **`production`**
   - **Nome da credencial:** `github-kinkconsentmanager-production`
4. Clique em **Adicionar (Add)**.

### 2.3 Conceder permissão RBAC no Resource Group / Web App
1. No Portal do Azure, abra o Resource Group **`kinkconsentmanagerrg`** (ou diretamente o Web App **`kinkconsentmanagerapp`**).
2. Vá em **Controle de acesso (IAM) → + Adicionar → Adicionar atribuição de função (Add role assignment)**.
3. Selecione a função **`Colaborador de Site` (`Website Contributor`)** (ou `Contributor` se o deploy gerenciar configurações do App Service) e clique em **Avançar**.
4. Em **Membros**, clique em **+ Selecionar membros**, procure pelo nome do App Registration criado/selecionado no passo 2.1 e clique em **Revisar + atribuir**.

---

## Passo 3 — Criar o Environment `production` no GitHub (Aprovação + Regra `main`)

Como o projeto utiliza **uma única branch (`main`)**, este passo garante que nenhum deploy chegue ao Azure sem aprovação humana explícita.

1. No repositório do GitHub, acesse **Settings → Environments**.
2. Clique em **New environment**, informe o nome **`production`** (exatamente em minúsculas) e clique em **Configure environment**.
3. Marque **Required reviewers**:
   - Adicione você (ou os revisores responsáveis) na lista de aprovadores;
   - *(Opcional)* Marque ou desmarque *Prevent self-review*: em repositórios individuais com apenas 1 mantenedor, deixe **desmarcado** para conseguir aprovar seus próprios deploys.
4. Em **Deployment branches and tags**:
   - Troque de *All branches* para **Selected branches and tags**;
   - Clique em **Add deployment branch or tag rule**, informe **`main`** e salve.
5. Clique em **Save protection rules**.

---

## Passo 4 — Cadastrar Secrets e Variables no GitHub

> **Segurança:** nunca coloque GUIDs reais do Azure, senhas Docker ou tokens diretamente nos arquivos `.yml`. Cadastre tudo no painel do GitHub.

### 4.1 Secrets do Environment `production` (`Settings → Environments → production → Environment secrets`)

| Nome do Secret | Valor | Obrigatório |
| -------------- | ----- | ----------- |
| `AZURE_CLIENT_ID` | `<ID do aplicativo (cliente) do Entra ID>` | Sim (para Azure Deploy) |
| `AZURE_TENANT_ID` | `<ID do diretório (locatário) do Entra ID>` | Sim (para Azure Deploy) |
| `AZURE_SUBSCRIPTION_ID` | `<ID da assinatura do Azure>` | Sim (para Azure Deploy) |

### 4.2 Secrets do Repositório (`Settings → Secrets and variables → Actions → Repository secrets`)

| Nome do Secret | Valor | Obrigatório |
| -------------- | ----- | ----------- |
| `SONAR_TOKEN` | Token gerado no SonarCloud (`My Account → Security`) | Sim (se `run_sonarcloud: true`) |
| `DOCKER_USERNAME` | Usuário do Docker Hub / Registry | Somente se `run_docker_publish: true` |
| `DOCKER_PASSWORD` | Access Token do Docker Hub / Registry | Somente se `run_docker_publish: true` |
| `SNYK_TOKEN` | Token de API do Snyk | Opcional |

### 4.3 Variables do Repositório ou Environment (`Settings → Secrets and variables → Actions → Variables`)

O workflow possui valores padrão embutidos, mas você pode sobrescrevê-los sem editar YAML criando estas variáveis:

| Nome da Variable | Valor Padrão no Workflow | Quando Customizar |
| ---------------- | ------------------------ | ----------------- |
| `AZURE_WEBAPP_NAME` | `kinkconsentmanagerapp` | Se mudar o nome do Web App |
| `AZURE_WEBAPP_URL` | `https://kinkconsentmanagerapp.azurewebsites.net` | URL exata exibida na Visão Geral do Azure (para o smoke test HTTPS pós-deploy) |
| `DOCKER_REGISTRY` | `docker.io` | Se usar ACR (`*.azurecr.io`) ou GHCR (`ghcr.io`) |
| `DOCKER_IMAGE` | `leonecr/kinkconsentmanager-ui` | Se publicar imagem em outro namespace/repositório |

> **Dica:** Na captura de Visão Geral do Azure, confirme a URL completa em **Domínios padrão** (alguns App Services novos usam subdomínios regionais como `...-brazilsouth-01.azurewebsites.net`). Copie essa URL exata para `AZURE_WEBAPP_URL` para o smoke test e o link do Environment no GitHub apontarem para o endereço certo.

---

## Passo 5 — Configurar o SonarCloud para Análise via CI

O repositório já possui [`frontend/sonar-project.properties`](../frontend/sonar-project.properties) configurado (`sonar.projectKey=lionscorp_kinkconsentmanager-ui`, `sonar.organization=lionscorp`).

1. Acesse [SonarCloud](https://sonarcloud.io/) e abra o projeto **`lionscorp_kinkconsentmanager-ui`**.
2. Vá em **Administration → Analysis Method**.
3. **Desative** a opção **Automatic Analysis** (caso esteja ativa), pois análises automáticas conflitam com envios via GitHub Actions/CI.
4. Em **My Account → Security**, gere um token e salve-o no GitHub como `SONAR_TOKEN` (Passo 4.2).
5. Durante o CI, o `npm run test:ci` alimentará automaticamente:
   - `frontend/coverage/lcov.info` (cobertura de código no SonarCloud);
   - `frontend/coverage/sonar/sonar-report.xml` (execução dos testes Jest);
   - `frontend/coverage/junit/test-results.xml` e `frontend/coverage/cobertura-coverage.xml` (artefatos e resumo de testes no GitHub).

---

## Passo 6 — Ativar o Workflow no GitHub e Substituir o QuickDeploy Antigo

Atualmente existem dois arquivos distintos no repositório:
- **Novo (template pronto, desativado):** [`ci-cd/github/kinkconsentmanager-ci-cd.yml`](./github/kinkconsentmanager-ci-cd.yml)
- **Antigo (gerado automaticamente pelo Azure QuickDeploy):** [`.github/workflows/main_kinkconsentmanagerapp.yml`](../.github/workflows/main_kinkconsentmanagerapp.yml)

> **Por que substituir o arquivo antigo?** O `main_kinkconsentmanagerapp.yml` dispara automaticamente a cada push em `main`, executa `npm install` na **raiz do repositório** (onde não existe `package.json`), ignora `frontend/`, não roda cobertura/SonarCloud/Docker e possui IDs fixos no YAML.

Quando estiver pronto para ativar:

1. Copie [`ci-cd/github/kinkconsentmanager-ci-cd.yml`](./github/kinkconsentmanager-ci-cd.yml) para `.github/workflows/kinkconsentmanager-ci-cd.yml`.
2. Remova (ou renomeie/apague) `.github/workflows/main_kinkconsentmanagerapp.yml` para evitar execuções duplicadas e falhas de build na raiz.
3. Faça commit e push dessas alterações na branch `main`.

> **Importante:** Nesta etapa inicial, o novo workflow continua **sem triggers automáticos** (`push` e `pull_request` permanecem comentados), executando somente sob demanda via **Run workflow**.

---

## Passo 7 — Testar Manualmente e Aprovar o Deploy

### 7.1 Primeiro teste apenas de CI (Build + Testes + SonarCloud)
1. No GitHub, acesse a aba **Actions**.
2. Selecione **KinkConsentManager CI/CD** na barra lateral esquerda.
3. Clique em **Run workflow** (branch **`main`**):
   - `run_sonarcloud`: **`true`** *(ou `false` se ainda não configurou `SONAR_TOKEN`)*
   - `run_docker_publish`: **`false`**
   - `run_azure_deploy`: **`false`**
4. Clique em **Run workflow** e acompanhe o job **`CI — Build, Testes, Cobertura & SonarCloud`**.
5. Ao finalizar, confira nos **Artifacts** do run:
   - `webapp-dist` (contendo `index.html`, `assets/`, chunks JS/CSS)
   - `frontend-coverage-reports` (`cobertura-coverage.xml`, `lcov.info`, `test-results.xml`, `sonar-report.xml`)

### 7.2 Segundo teste com Deploy Aprovado no Azure (e Docker opcional)
1. Execute novamente **Run workflow** na branch **`main`** marcando:
   - `run_azure_deploy`: **`true`**
   - `run_docker_publish`: **`true`** *(se já cadastrou `DOCKER_USERNAME` / `DOCKER_PASSWORD`)*
2. Quando o job `ci_build_quality` concluir com sucesso, o estágio `cd_deploy_azure` ficará pausado com status **Waiting (Review pending)**.
3. Clique em **Review deployments**, marque **`production`**, escreva um comentário opcional e clique em **Approve and deploy**.
4. Acompanhe o upload do artefato `./webapp-dist` para o slot **`Production`** de `kinkconsentmanagerapp` e acesse a URL configurada em `AZURE_WEBAPP_URL`.

---

## Passo 8 — Habilitar CI Automático na Branch Única `main` (Quando Desejar)

Quando quiser que commits ou PRs na branch `main` validem o CI automaticamente (mantendo o deploy protegido pelo Environment `production` ou disparo manual):

1. Abra `.github/workflows/kinkconsentmanager-ci-cd.yml`.
2. Descomente as linhas de `push` e `pull_request`:
   ```yaml
   on:
     workflow_dispatch:
       # ...
     push:
       branches: [ main ]
       paths:
         - 'frontend/**'
         - 'ci-cd/**'
         - '.github/workflows/kinkconsentmanager-ci-cd.yml'
     pull_request:
       branches: [ main ]
       paths:
         - 'frontend/**'
   ```
3. *(Recomendado)* Em **Settings → Rules → Rulesets** (ou **Branch protection rules**), proteja a branch `main` exigindo o status check **`CI — Build, Testes, Cobertura & SonarCloud`**.

---

## Passo 9 — Troubleshooting Rápido

| Sintoma / Erro | Causa Mais Provável | Solução |
| -------------- | ------------------- | ------- |
| `AADSTS70021: No matching federated identity record found for presented assertion` | A credencial federada no Entra ID está configurada para *Branch `main`* em vez de *Environment `production`* | Recrie/edite a Federated Credential no Passo 2.2 usando **Entity type = `Environment`** e nome **`production`** |
| Logs do Azure mostram `node /opt/startup/default-static-site.js` | Falta Startup Command no Azure App Service ou deploy enviou pasta errada | Confirme `pm2 serve /home/site/wwwroot --no-daemon --spa` (Passo 1) e se `index.html` está na raiz de `/home/site/wwwroot` |
| Acesso direto a `/checklist` ou `/export` retorna `404` | Startup command sem `--spa` | Adicione `--spa` ao comando do `pm2 serve` e reinicie o App Service |
| Erro no SonarCloud: *"You are running CI analysis while Automatic Analysis is enabled"* | Automatic Analysis ativo no painel do SonarCloud | Desative em **SonarCloud → Administration → Analysis Method** (Passo 5) |
| Workflow executa `npm install` na raiz e falha | O arquivo antigo `main_kinkconsentmanagerapp.yml` ainda está ativo em `.github/workflows/` | Remova `main_kinkconsentmanagerapp.yml` após ativar `kinkconsentmanager-ci-cd.yml` |
