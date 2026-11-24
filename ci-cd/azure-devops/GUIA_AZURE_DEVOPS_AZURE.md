# Guia Passo a Passo — Configurar CI/CD no Azure DevOps para o Azure App Service (`kinkconsentmanagerapp`)

Este guia detalha tudo o que você precisa fazer no **Azure DevOps**, no **GitHub**, no **Azure Portal / Microsoft Entra ID** e no **SonarCloud** para habilitar o pipeline [`azure-pipelines.yml`](./azure-devops/azure-pipelines.yml) com:

- Build Angular 22 (`npm run build:prod`) + Testes Jest 30 + Cobertura (`Cobertura`, `LCOV`, `JUnit`, `Sonar`) e relatório HTML via `ReportGenerator@5`;
- Análise e Quality Gate no **SonarCloud** (`SonarCloudPrepare@3`, `SonarCloudAnalyze@3`, `SonarCloudPublish@3`);
- Estágio separado opcional de **Docker Build + Smoke Test (`/health`) + Push** (`CD_Docker_Image`);
- Deploy no **Azure App Service Linux (`kinkconsentmanagerapp`)** via `AzureWebApp@1` com **Workload Identity Federation (OIDC)**, **aprovação humana obrigatória** e controle de **branch única `main`** (`CD_Deploy_Azure`).

> **Links rápidos:** [Visão Geral `ci-cd/README.md`](./README.md) · [Pipeline Azure DevOps](./azure-devops/azure-pipelines.yml) · [Guia GitHub Actions](./GUIA_GITHUB_ACTIONS_AZURE.md) · [SonarCloud Config](../frontend/sonar-project.properties) · [Documentação Central](../docs/README.md)

---

## É possível usar Repositório Privado com Projeto Público no Azure DevOps?

**Depende de onde o repositório privado está hospedado.** A tabela abaixo resume os três cenários possíveis:

| Cenário | É possível? | O que fica visível ao público | Recomendação |
| ------- | ----------- | ----------------------------- | ------------ |
| **1. Azure Repos privado dentro de Projeto Público no Azure DevOps** | **Não** | Em um projeto público do Azure DevOps, **todos** os repositórios do *Azure Repos* herdam acesso público de leitura (não existe repositório privado dentro de projeto público). | Inválido para código privado |
| **2. Projeto Público no Azure DevOps + Repositório Privado no GitHub (`LeoneRocha/kinkconsentmanager`)** | **Sim (com ressalvas)** | O código no GitHub continua privado, **porém** em um projeto público do Azure DevOps visitantes anônimos podem ver logs do pipeline, baixar artefatos publicados (`drop-webapp`, `drop-docker-compose`) e abrir o HTML do `ReportGenerator@5` na aba *Code Coverage* (que exibe trechos do código-fonte). | Use apenas se aceitar essa exposição ou aplicar mitigações |
| **3. Projeto Privado no Azure DevOps + Repositório Privado (GitHub ou Azure Repos) + App Web Público (`kinkconsentmanagerapp`)** | **Sim (Ideal)** | Código, logs de build, cobertura e artefatos ficam **100% privados** no Azure DevOps; apenas o site Angular compilado no Azure App Service (`kinkconsentmanagerapp`) fica público na internet. | **Recomendado** |

### Pontos críticos se você usar Projeto Público no Azure DevOps + GitHub Privado (Cenário 2)

1. **Vazamento indireto via relatórios e artefatos:** Mesmo com o código no GitHub privado e o serviço *Repos* desabilitado no Azure DevOps, um projeto **Public** permite que qualquer usuário na internet consulte os runs do **Azure Pipelines**. No pipeline atual ([`azure-pipelines.yml`](./azure-devops/azure-pipelines.yml)):
   - O `ReportGenerator@5` (`HtmlInline_AzurePipelines`) embute a visualização linha a linha dos arquivos `.ts` de `frontend/src` na aba **Code Coverage**;
   - O `PublishPipelineArtifact@1` publica o bundle compilado (`drop-webapp`) e o `dockercompose.prod.yml` (`drop-docker-compose`);
   - Logs detalhados de comandos e variáveis não marcadas como *secret* ficam legíveis publicamente.
2. **Política de minutos gratuitos (Parallel Jobs):** Projetos públicos oferecem execução gratuita voltada a **projetos open-source**. Usar um projeto público apenas para contornar o limite de paralelismo em um repositório privado viola os termos de uso de projetos públicos da Microsoft.
3. **Checklist mínimo se optar por esse modelo mesmo assim:**
   - Em **Project Settings → Overview → Azure DevOps services**, **desative o serviço `Repos`** para não criar repositórios acidentalmente no projeto público;
   - Mantenha qualquer credencial ou URL sensível marcada como **Secret** (ícone de cadeado) no Variable Group `kinkconsentmanager-ci-vars`;
   - Considere remover ou desativar o `ReportGenerator@5` (ou trocar `reporttypes` para apenas `Cobertura`) e restringir o download anônimo caso não queira o código-fonte exibido na aba *Code Coverage*.

### Como rodar no Cenário 3 (Projeto Privado — Recomendado) sem pagar pelos Microsoft-Hosted Agents

Organizações novas do Azure DevOps vêm com **0 parallel jobs gratuitos** por padrão para projetos privados, mas há duas formas gratuitas e oficiais de liberar:

1. **Solicitar o grant gratuito de 1.800 minutos/mês (Microsoft-Hosted):**
   - Preencha o formulário oficial da Microsoft em [`https://aka.ms/azpipelines-parallelism-request`](https://aka.ms/azpipelines-parallelism-request) informando o nome da sua organização Azure DevOps e especificando uso em projeto **Private** (a aprovação costuma ocorrer em poucos dias úteis e libera **1 parallel job com 1.800 min/mês** gratuitos).
2. **Usar um Self-Hosted Agent (imediato e ilimitado):**
   - Toda organização privada já inclui **1 self-hosted parallel job gratuito** sem limite de minutos. Você pode registrar um agente na sua máquina local, em uma VM ou container Docker (com Node.js 24 instalado) e apontar o `pool:` do pipeline para o seu pool privado.

---

## Arquitetura do Pipeline no Azure DevOps

```text
  [Push em main (frontend/** · ci-cd/**) ou Disparo Manual]
                       │
                       ▼
  1. CI_Build_Quality (Job: BuildAndTestFrontend)
     ├── checkout: self (fetchDepth: 0 para SonarCloud)
     ├── NodeTool@0 (24.x) + Cache@2 + Npm@1 ci (em frontend/)
     ├── npm audit + SnykSecurityScan@1 (se enableSnykScan == true)
     ├── npm run build:prod  ──► frontend/dist/kinkconsentmanager/browser/
     ├── npm run test:ci     ──► JUnit + Cobertura + LCOV + Sonar XML
     ├── SonarCloudPrepare@3 + SonarCloudAnalyze@3 + SonarCloudPublish@3 (se enableSonarCloud == true; só após build & testes)
     ├── PublishTestResults@2 + ReportGenerator@5 + PublishCodeCoverageResults@2 (só após Quality Gate)
     └── ArchiveFiles@2 (.zip) + PublishPipelineArtifact@1 (drop-webapp · drop-docker-compose)
                       │
                       ├──► 2. CD_Docker_Image (se branch == main E enableDockerPublish == true)
                       │       └── Docker Build -> Smoke Test (/health e /) -> Docker Push
                       │
                       └──► 3. CD_Deploy_Azure (se branch == main E enableAzureDeploy == true)
                               ├── Gate: Environment `production` (Approvals + Branch control `refs/heads/main`)
                               ├── download: current (drop-webapp)
                               └── AzureWebApp@1 -> kinkconsentmanagerapp (NODE|24-lts + --spa)
```

---

## Passo 1 — Pré-requisitos na Organização Azure DevOps (Extensões e Parallel Jobs)

Antes de cadastrar o YAML, instale as extensões do **Visual Studio Marketplace** na sua organização Azure DevOps (`https://dev.azure.com/<SUA_ORG>`), pois as tasks abaixo não vêm pré-instaladas nativamente:

| Extensão no Marketplace | Publicador | Tasks Utilizadas no YAML | Obrigatória? |
| ----------------------- | ---------- | ------------------------ | ------------ |
| **[SonarCloud](https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud)** | SonarSource | `SonarCloudPrepare@3`, `SonarCloudAnalyze@3`, `SonarCloudPublish@3` | Sim (se `enableSonarCloud: true`) |
| **[ReportGenerator](https://marketplace.visualstudio.com/items?itemName=Palmmedia.reportgenerator)** | Palmmedia | `ReportGenerator@5` | Sim (usada incondicionalmente no estágio `CI_Build_Quality`) |
| **[Snyk Security Scan](https://marketplace.visualstudio.com/items?itemName=Snyk.snyk-security-scan)** | Snyk | `SnykSecurityScan@1` | Opcional (somente se `enableSnykScan: true`) |

### Como instalar e conferir Parallel Jobs
1. Acesse a extensão no Marketplace pelos links acima e clique em **Get it free** → selecione sua organização do Azure DevOps → **Install**.
2. Em seguida, na sua organização Azure DevOps, vá em **Organization settings → Pipelines → Parallel jobs**.
3. Verifique se há pelo menos `1` parallel job em **Microsoft-hosted (Private / Public)** ou configure um **Self-hosted** caso o valor para projetos privados esteja em `0` (e solicite o grant gratuito em [`https://aka.ms/azpipelines-parallelism-request`](https://aka.ms/azpipelines-parallelism-request)).

---

## Passo 2 — Criar o Projeto no Azure DevOps e Conectar o Repositório Privado do GitHub

### 2.1 Criar e configurar o Projeto no Azure DevOps
1. Na página inicial da sua organização (`https://dev.azure.com/<SUA_ORG>`), clique em **+ New project**.
2. Informe um nome (ex.: `KinkConsentManager`) e escolha a visibilidade:
   - **Private (Recomendado):** mantém logs, variáveis, cobertura e artefatos privados.
   - **Public (Somente se necessário):** após criar o projeto, acesse **Project settings → Overview → Azure DevOps services**, desative **Repos** (e opcionalmente **Boards** / **Test Plans** / **Artifacts**) deixando apenas **Pipelines** ativo, e revise os alertas de exposição da seção inicial.

### 2.2 Conectar o Repositório Privado no GitHub (`LeoneRocha/kinkconsentmanager`)
A forma mais segura e recomendada é via **Azure Pipelines GitHub App**:

1. No GitHub, acesse **Settings (da sua conta) → Applications → Installed GitHub Apps** (ou ao criar a Service Connection/Pipeline no passo abaixo, escolha **GitHub App**).
2. Instale ou configure o **Azure Pipelines** concedendo acesso **Only select repositories** → marque apenas **`LeoneRocha/kinkconsentmanager`**.
3. Alternativamente, caso prefira criar a conexão manualmente no Azure DevOps antes do pipeline:
   - Vá em **Project settings → Pipelines → Service connections → New service connection → GitHub**.
   - Escolha **Grant authorization** (OAuth / GitHub App) ou **Personal Access Token (PAT)** com escopos `repo`, `admin:repo_hook` e `user:email`.
   - Nomeie a conexão (ex.: `github-leonecr-kinkconsentmanager`) e salve.

---

## Passo 3 — Configurar o Startup Command SPA no Azure App Service (`kinkconsentmanagerapp`)

Sem o parâmetro `--spa`, o Azure App Service Linux (Node) executa `node /opt/startup/default-static-site.js` ou retorna `404` ao recarregar rotas internas do Angular (`/checklist`, `/export`).

1. Acesse o **Portal do Azure** e abra o Web App **`kinkconsentmanagerapp`** (Resource Group **`kinkconsentmanagerrg`**).
2. No menu lateral esquerdo, vá em **Configurações (Settings) → Configuração (Configuration) → Configurações gerais (General settings)**.
3. Em **Comando de inicialização (Startup Command)**, preencha exatamente:
   ```bash
   pm2 serve /home/site/wwwroot --no-daemon --spa
   ```
4. Clique em **Salvar (Save)** e confirme o reinício.

> **Nota sobre o pipeline:** A task `AzureWebApp@1` no [`azure-pipelines.yml`](./azure-devops/azure-pipelines.yml) também envia explicitamente `runtimeStack: 'NODE|24-lts'` e `startUpCommand: '$(azureStartupCommand)'` (`pm2 serve /home/site/wwwroot --no-daemon --spa`) durante o deploy, reforçando essa configuração a cada publicação.

---

## Passo 4 — Criar as Service Connections no Azure DevOps

No projeto do Azure DevOps, acesse **Project settings (canto inferior esquerdo) → Pipelines → Service connections**.

> **Segurança:** nunca insira GUIDs reais do Azure, senhas Docker ou tokens diretamente no `azure-pipelines.yml`. Tudo deve residir nas Service Connections e no Variable Group.

### 4.1 Azure Resource Manager (`azureServiceConnection`) via Workload Identity Federation (OIDC)

Você tem duas opções (ambas sem senha/secret expirando):

#### Opção A — Automática (Mais rápida)
1. Clique em **New service connection → Azure Resource Manager → Next**.
2. Selecione **Workload Identity federation (automatic)** → **Next**.
3. Selecione sua **Subscription** e, em **Resource group**, escolha **`kinkconsentmanagerrg`** *(restringe a permissão apenas ao grupo de recursos do Web App)*.
4. Em **Service connection name**, informe um nome claro (ex.: `azure-kinkconsentmanager-oidc`).
5. Marque **Grant access permission to all pipelines** (ou autorize especificamente no Passo 8) e clique em **Save**.

#### Opção B — Manual (Reutilizando um App Registration existente no Microsoft Entra ID)
1. Clique em **New service connection → Azure Resource Manager → Workload Identity federation (manual)**.
2. Informe o nome da conexão (ex.: `azure-kinkconsentmanager-oidc`), salve o rascunho para copiar o **Issuer** e o **Subject identifier** gerados pelo Azure DevOps.
3. No **Portal do Azure → Microsoft Entra ID → App registrations**, abra o App Registration desejado e vá em **Certificates & secrets → Federated credentials → + Add credential**.
4. Escolha o cenário **Other issuer**, cole exatamente o **Issuer** e o **Subject identifier** fornecidos pelo Azure DevOps, informe um nome (ex.: `azdo-kinkconsentmanager`) e salve.
5. De volta ao Azure DevOps, preencha:
   - **Subscription Id:** `<ID da assinatura do Azure>`
   - **Subscription Name:** `<Nome da assinatura>`
   - **Service Principal Id (Client ID):** `<ID do aplicativo (cliente) do Entra ID>`
   - **Tenant ID:** `<ID do diretório (locatário) do Entra ID>`
6. Clique em **Verify and save**.
7. No Portal do Azure, abra o Resource Group **`kinkconsentmanagerrg`** → **Controle de acesso (IAM) → + Adicionar atribuição de função** e atribua **`Website Contributor`** (ou `Contributor`) ao App Registration escolhido.

### 4.2 SonarCloud (`sonarCloudServiceConnection`)
O repositório já possui [`frontend/sonar-project.properties`](../frontend/sonar-project.properties) configurado (`sonar.projectKey=lionscorp_kinkconsentmanager-ui`, `sonar.organization=lionscorp`).

1. Acesse o [SonarCloud](https://sonarcloud.io/) → abra o projeto **`lionscorp_kinkconsentmanager-ui`**.
2. Vá em **Administration → Analysis Method** e **desative** a opção **Automatic Analysis** (caso esteja ativa, ela bloqueia envios feitos via CI).
3. Em **My Account → Security**, gere um token para o Azure DevOps.
4. No Azure DevOps (**Project settings → Service connections → New service connection**), selecione **SonarCloud**.
5. Cole o token em **SonarCloud Token**, nomeie a conexão (ex.: `sonarcloud-lionscorp`) e clique em **Verify and save**.

### 4.3 Docker Registry (`dockerRegistryServiceConnection`) — *Opcional*
Necessária apenas quando você quiser rodar com `enableDockerPublish: true`:
1. Clique em **New service connection → Docker Registry**.
2. Escolha **Docker Hub** (ou **Azure Container Registry** / outro registry), informe usuário/token e salve com o nome desejado (ex.: `dockerhub-leonecr`).

### 4.4 Snyk (`snykServiceConnection`) — *Opcional*
Necessária apenas quando você quiser rodar com `enableSnykScan: true`:
1. Clique em **New service connection → Snyk Authentication**, cole o API Token do Snyk e salve (ex.: `snyk-kinkconsentmanager`).

---

## Passo 5 — Criar o Variable Group `kinkconsentmanager-ci-vars`

O arquivo [`azure-pipelines.yml`](./azure-devops/azure-pipelines.yml) referencia explicitamente `- group: kinkconsentmanager-ci-vars`. Sem esse Variable Group criado e autorizado, o Azure DevOps recusa iniciar o pipeline.

1. No Azure DevOps, acesse **Pipelines → Library → + Variable group**.
2. Em **Variable group name**, digite exatamente: **`kinkconsentmanager-ci-vars`**.
3. Adicione as variáveis abaixo na seção **Variables**:

| Nome da Variável | Valor Exemplo / Referência | Marcar como Secret? | Obrigatória? |
| ---------------- | -------------------------- | ------------------- | ------------ |
| `enableSonarCloud` | `'false'` *(padrão desativado; mude para `'true'` quando quiser ativar via variável)* | Não | Opcional (sobrescreve o padrão `'false'` do YAML) |
| `enableSnykScan` | `'false'` *(padrão desativado; mude para `'true'` quando quiser ativar via variável)* | Não | Opcional (sobrescreve o padrão `'false'` do YAML) |
| `azureServiceConnection` | Nome exato da Service Connection criada no Passo 4.1 (ex.: `azure-kinkconsentmanager-oidc`) | Não | Sim (para `enableAzureDeploy: true`) |
| `sonarCloudServiceConnection` | Nome exato da Service Connection criada no Passo 4.2 (ex.: `sonarcloud-lionscorp`) | Não | Sim (mantenha cadastrada mesmo com Sonar desativado, para validação inicial do YAML) |
| `AZURE_WEBAPP_URL` | URL exata exibida em *Domínios padrão* do Web App no Azure (ex.: `https://kinkconsentmanagerapp.azurewebsites.net`) | Não | Recomendada (usada no smoke test pós-deploy) |
| `dockerRegistryServiceConnection` | Nome exato da Service Connection Docker do Passo 4.3 | Não | Somente se `enableDockerPublish: true` |
| `snykServiceConnection` | Nome exato da Service Connection Snyk do Passo 4.4 | Não | Sim (mantenha cadastrada mesmo com Snyk desativado, para validação inicial do YAML) |

4. Clique em **Save**.
5. *(Opcional)* Após criar o pipeline no Passo 7, volte em **Pipelines → Library → `kinkconsentmanager-ci-vars` → Pipeline permissions** e autorize o pipeline (ou clique em **Authorize resources** na primeira execução).

> **Atenção — Precedência e validação de conexões no YAML:**
> - **Sobrescrita via Variable Group / UI:** No [`azure-pipelines.yml`](./azure-devops/azure-pipelines.yml), os padrões `enableSonarCloud` (`'false'`), `enableSnykScan` (`'false'`), `sonarOrganization` (`lionscorp`), `azureWebAppName` (`kinkconsentmanagerapp`), `azureStartupCommand` (`pm2 serve /home/site/wwwroot --no-daemon --spa`) e `dockerImageRepository` (`leonecr/kinkconsentmanager-ui`) são declarados **antes** de `- group: kinkconsentmanager-ci-vars`, permitindo sobrescrita direta pelo Variable Group ou pelas variáveis da pipeline na UI do Azure DevOps.
> - **Validação das Service Connections:** Como os steps de Snyk (`SnykSecurityScan@1`) e SonarCloud (`SonarCloudPrepare@3`, `SonarCloudAnalyze@3`, `SonarCloudPublish@3`) são avaliados em tempo de execução via `condition:` (para responderem tanto a parâmetros quanto a variáveis da pipeline), o Azure DevOps valida que `sonarCloudServiceConnection` e `snykServiceConnection` apontam para Service Connections válidas no momento em que o run inicia, mesmo quando `enableSonarCloud` e `enableSnykScan` estiverem como `false`.

---

## Passo 6 — Criar o Environment `production` (Aprovação Humana + Regra `main`)

Como o repositório usa **branch única (`main`)**, o Environment `production` impede qualquer deploy acidental sem revisão humana:

1. No Azure DevOps, acesse **Pipelines → Environments → Create environment** (ou **New environment**).
2. Preencha:
   - **Name:** **`production`** *(exatamente em minúsculas, igual a `environment: 'production'` no YAML)*
   - **Resource:** selecione **None** *(o deploy usa `AzureWebApp@1`, não VM/Kubernetes)*
3. Clique em **Create**.
4. Dentro do Environment `production`, abra o menu de opções (**⋮** no canto superior direito) → **Approvals and checks**.
5. Adicione o primeiro check — **Approvals**:
   - Em **Approvers**, adicione você (e os revisores responsáveis);
   - Em **Advanced**, se for um projeto mantido por você mesmo, **marque** a opção **"Allow approvers to approve their own runs"** *(caso contrário, não conseguirá aprovar o deploy disparado por você)*;
   - Clique em **Create**.
6. Clique em **+ (Add check)** novamente e adicione **Branch control**:
   - Em **Allowed branches**, informe exatamente: **`refs/heads/main`**
   - Deixe **Verify branch protection** conforme sua necessidade e clique em **Create**.

---

## Passo 7 — Cadastrar o Pipeline YAML no Azure DevOps

1. No Azure DevOps, acesse **Pipelines → Pipelines → New pipeline** (ou **Create Pipeline**).
2. Em **Where is your code?**, selecione **GitHub** (YAML).
3. Autorize o **Azure Pipelines GitHub App** (se ainda não tiver feito) e selecione o repositório privado **`LeoneRocha/kinkconsentmanager`**.
4. Na etapa **Configure your pipeline**, clique em **Existing Azure Pipelines YAML file**.
5. Preencha:
   - **Branch:** **`main`**
   - **Path:** **`/ci-cd/azure-devops/azure-pipelines.yml`**
6. Clique em **Continue**.
7. Na tela de revisão (**Review your pipeline YAML**), **NÃO** execute ainda se preferir apenas cadastrar: clique na seta ao lado de **Run** → **Save** *(ou renomeie o pipeline antes em Triggers/Settings para `KinkConsentManager-CI-CD`)*.

> **Importante:** Como o arquivo começa com `trigger: none` e `pr: none`, salvar o pipeline **não** dispara execuções automáticas em commits nem altera o comportamento do repositório no GitHub.

---

## Passo 8 — Testar Manualmente (CI) e Executar o Deploy Aprovado (CD)

### 8.1 Primeiro teste apenas de CI (Build + Jest + Cobertura)
1. Acesse **Pipelines → `KinkConsentManager-CI-CD` → Run pipeline**.
2. Em **Branch/tag**, mantenha **`main`**.
3. Confira os parâmetros de execução (todos os opcionais vêm desmarcados por padrão):
   - **Versão do Node.js (`nodeVersion`):** `24.x`
   - **Executar análise e Quality Gate no SonarCloud (`enableSonarCloud`):** desmarcado (`false`) *(padrão; pode ser ligado aqui ou pela variável `enableSonarCloud='true'`)*
   - **Executar Snyk Security Scan (`enableSnykScan`):** desmarcado (`false`) *(padrão; pode ser ligado aqui ou pela variável `enableSnykScan='true'`)*
   - **Executar estágio CD — Build & Push da imagem Docker (`enableDockerPublish`):** desmarcado (`false`)
   - **Executar estágio CD — Deploy no Azure Web App (`enableAzureDeploy`):** desmarcado (`false`)
4. Clique em **Run**.
5. Se aparecer o aviso **"This pipeline needs permission to access a resource before this run can continue"**, clique em **View → Permit** para autorizar o Variable Group `kinkconsentmanager-ci-vars` e as Service Connections declaradas no pipeline.
6. Ao finalizar o estágio `CI_Build_Quality`, confira:
   - Aba **Tests:** resultados JUnit do Jest (`Jest Unit Tests — KinkConsentManager UI`);
   - Aba **Code Coverage:** cobertura Cobertura XML + relatório consolidado do `ReportGenerator@5`;
   - **SonarCloud:** *(quando `enableSonarCloud` estiver `true`)* métricas e Quality Gate de `lionscorp_kinkconsentmanager-ui`;
   - **1 published / Artifacts:** `drop-webapp` (`kinkconsentmanager-ui-<BuildId>.zip`) e `drop-docker-compose` (`dockercompose.prod.yml`).

### 8.2 Segundo teste com Deploy Aprovado no Azure (e Docker opcional)
1. Clique novamente em **Run pipeline** na branch **`main`** e marque:
   - `enableAzureDeploy`: **marcado (`true`)**
   - `enableDockerPublish`: **marcado (`true`)** *(apenas se configurou `dockerRegistryServiceConnection`)*
2. Quando o estágio `CI_Build_Quality` concluir com sucesso, o estágio `CD_Deploy_Azure` ficará pausado aguardando revisão (**1 check pending**).
3. Clique em **Review** no banner do estágio `CD_Deploy_Azure`, revise as informações e clique em **Approve**.
4. Aguarde a conclusão do `AzureWebApp@1` e do **Smoke test pós-deploy HTTPS**.
5. Acesse a URL configurada em `AZURE_WEBAPP_URL` e valide também o acesso direto às rotas SPA `/checklist` e `/export` (incluindo recarregamento `F5` no navegador).

---

## Passo 9 — Habilitar CI Automático na Branch Única `main` (Quando Desejar)

Quando quiser que alterações em `frontend/` ou `ci-cd/` na branch `main` disparem o estágio de CI automaticamente (mantendo os estágios de CD protegidos pelos parâmetros `false` por padrão e pelo gate do Environment `production`):

1. Abra [`ci-cd/azure-devops/azure-pipelines.yml`](./azure-devops/azure-pipelines.yml).
2. Remova `trigger: none` e descomente o bloco `trigger:` (linhas 26–36):
   ```yaml
   trigger:
     branches:
       include:
         - main
     paths:
       include:
         - frontend/**
         - ci-cd/**
       exclude:
         - docs/**
         - '**/*.md'

   pr: none
   ```
3. *(Opcional)* Se quiser validar Pull Requests no GitHub antes do merge na `main`, configure também `pr:` apontando para `main`.

---

## Passo 10 — Troubleshooting Rápido (Azure DevOps)

| Sintoma / Erro | Causa Mais Provável | Solução |
| -------------- | ------------------- | ------- |
| `##[error]No hosted parallelism has been purchased or granted` | Organização nova do Azure DevOps ainda sem cota gratuita em projetos privados | Solicite os 1.800 min/mês gratuitos em [`https://aka.ms/azpipelines-parallelism-request`](https://aka.ms/azpipelines-parallelism-request) ou use um Self-Hosted Agent (veja a seção inicial) |
| Erro na validação do YAML: `A task is missing` (`ReportGenerator@5`, `SonarCloudPrepare@3` ou `SnykSecurityScan@1`) | Extensão do Marketplace ainda não instalada na organização | Instale **ReportGenerator** (Palmmedia) e **SonarCloud** (SonarSource) conforme o Passo 1 |
| `Variable group kinkconsentmanager-ci-vars could not be found` ou erro de autorização | Variable Group não criado com o nome exato ou sem permissão para o pipeline | Crie em **Pipelines → Library** com o nome exato `kinkconsentmanager-ci-vars` (Passo 5) e clique em **Permit** no pipeline |
| Aprovação do Environment `production` bloqueada para o próprio autor | Opção *Allow approvers to approve their own runs* desmarcada no check **Approvals** | Em **Environments → `production` → Approvals and checks → Approvals → Advanced**, marque **Allow approvers to approve their own runs** (Passo 6) |
| Código-fonte visível na aba *Code Coverage* em projeto público | `ReportGenerator@5` com `HtmlInline_AzurePipelines` em projeto com visibilidade *Public* | Altere o projeto do Azure DevOps para **Private** (recomendado) ou remova `HtmlInline_AzurePipelines` do `reporttypes` |
| Logs do Azure Web App mostram `default-static-site.js` ou `/checklist` retorna `404` | Startup command sem `--spa` ou pacote `.zip` com pasta extra na raiz | Confirme `pm2 serve /home/site/wwwroot --no-daemon --spa` (Passo 3) e verifique se `ArchiveFiles@2` mantém `includeRootFolder: false` |
| Erro no SonarCloud: *"You are running CI analysis while Automatic Analysis is enabled"* | *Automatic Analysis* ativo no painel do SonarCloud | Desative em **SonarCloud → Administration → Analysis Method** (Passo 4.2) |
