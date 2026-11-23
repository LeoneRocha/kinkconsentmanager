# Guia de Publicação Manual — Azure App Service Linux (`kinkconsentmanagerapp`)

Este documento consolida as **instruções completas de build, empacotamento e publicação manual** do frontend Angular **KinkConsentManager UI** no **Azure App Service Linux**, incluindo o diagnóstico oficial para logs de runtime e o plano alternativo para o runtime **Node 26** no plano **F1 Free**.

> **Links relacionados:** [Visão Geral CI/CD](../README.md) · [Guia GitHub Actions → Azure](../GUIA_GITHUB_ACTIONS_AZURE.md) · [Documentação Central](../../docs/README.md) · [Manifesto Frontend](../../frontend/package.json)

---

## Alvo Atual no Azure Portal

| Recurso | Configuração |
| ------- | ------------ |
| **App Service** | `kinkconsentmanagerapp` |
| **Resource Group** | `kinkconsentmanagerrg` |
| **Região / Plano / SO** | `Brazil South` · `F1 Free` · `Linux` |
| **Runtime Provisionado** | `Node 26` (`v26.13.1`) / compatível `NODE\|24-lts` |
| **Pasta de Build Angular** | `frontend/dist/kinkconsentmanager/browser/` |
| **Comando de Startup SPA** | `pm2 serve /home/site/wwwroot --no-daemon --spa` |

---

## Passo 1 — Gerar o Build de Produção Limpo

No terminal, a partir da raiz do repositório:

```powershell
cd frontend
npm.cmd ci
npm.cmd run build:prod
```

*(Em Linux/macOS, use `npm ci && npm run build:prod`.)*

> **Atenção crítica sobre o arquivo ZIP anterior:**
> Se existir algum arquivo `browser.zip` dentro de `frontend/dist/kinkconsentmanager/browser/`, **remova-o antes de gerar um novo pacote** para evitar que o ZIP antigo seja empacotado recursivamente dentro do novo deploy:
> ```powershell
> Remove-Item -Path .\dist\kinkconsentmanager\browser\browser.zip -ErrorAction SilentlyContinue
> ```
> Sempre salve o pacote `.zip` **fora** da pasta `browser/` (por exemplo, em `ci-cd/manualdeploy/kinkconsentmanager-ui.zip` ou `frontend/dist/kinkconsentmanager-ui.zip`).

---

## Passo 2 — Compactar o Pacote com `index.html` na Raiz do ZIP

A estrutura enviada ao Azure **precisa** conter `index.html`, `assets/` e os arquivos `.js`/`.css` diretamente na raiz do ZIP (e **não** dentro de uma subpasta `browser/`).

### Opção A — Windows PowerShell (a partir de `frontend/`)
```powershell
Compress-Archive -Path .\dist\kinkconsentmanager\browser\* -DestinationPath ..\ci-cd\manualdeploy\kinkconsentmanager-ui.zip -Force
```

Conferir o conteúdo do ZIP gerado:
```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::OpenRead("..\ci-cd\manualdeploy\kinkconsentmanager-ui.zip").Entries | Select-Object -First 15 FullName
```
*Saída esperada na raiz:* `assets/`, `assets/i18n/`, `index.html`, `main-*.js`, `styles-*.css`, `favicon.ico`, `site.webmanifest`.

### Opção B — Bash / Linux / Git Bash (a partir da raiz do repositório)
```bash
rm -f frontend/dist/kinkconsentmanager/browser/browser.zip
(cd frontend/dist/kinkconsentmanager/browser && zip -rq ../../../ci-cd/manualdeploy/kinkconsentmanager-ui.zip .)
```

---

## Passo 3 — Enviar o ZIP Manualmente para o Azure App Service

Escolha **uma** das formas abaixo:

### Forma 1 — Pelo Portal do Azure (QuickDeploy / Kudu ZipDeploy)
1. Acesse o App Service **`kinkconsentmanagerapp`** no Portal do Azure.
2. Envie o arquivo `kinkconsentmanager-ui.zip` pela tela de **Implantação / QuickDeploy** ou via **Ferramentas Avançadas (Kudu) → Ir → Tools → Zip Push Deploy**, arrastando o `.zip` para `/home/site/wwwroot`.

### Forma 2 — Pela Azure CLI (`az webapp deploy`)
```bash
az login
az webapp deploy \
  --resource-group kinkconsentmanagerrg \
  --name kinkconsentmanagerapp \
  --src-path ci-cd/manualdeploy/kinkconsentmanager-ui.zip \
  --type zip
```

> Lembre-se de apagar o `.zip` temporário local após o envio (`Remove-Item ci-cd\manualdeploy\kinkconsentmanager-ui.zip`) para não versionar artefatos binários no Git.

---

## Passo 4 — Configurar o Comando de Inicialização no Portal do Azure

1. Acesse o App Service **`kinkconsentmanagerapp`** no Portal do Azure.
2. No menu lateral, vá em **Configurações (Settings) → Configuração (Configuration) → Configurações gerais (General settings)**.
3. No campo **Comando de inicialização (Startup Command)**, cole:
   ```bash
   pm2 serve /home/site/wwwroot --no-daemon --spa
   ```
4. Clique em **Salvar (Save)** e depois em **Reiniciar (Restart)** na **Visão Geral**.
5. Aguarde **~30–60s** *(cold start normal do plano **F1 Free**)* e verifique novamente os **Logs de runtime** — em vez de `default-static-site.js`, deve aparecer o `pm2 serve` rodando na porta `8080`.
6. Valide no navegador:
   - Raiz `/` e rota `/checklist` carregam a tela de seleção de modo;
   - Atualizar a página (`F5`) diretamente em `/checklist` ou `/export` **não** retorna `404` (tratado pela flag `--spa`).

---

## Passo 5 — Diagnóstico dos Logs de Runtime (Por que o erro aconteceu?)

Quando o deploy manual é feito pela primeira vez no **Azure App Service Linux (Node.js)**, os logs costumam exibir:

```text
INFO Could not find build manifest file at '/home/site/wwwroot/oryx-manifest.toml'
...
node /opt/startup/default-static-site.js
```

Entenda o significado exato de cada linha:

1. **`Could not find build manifest file at '/home/site/wwwroot/oryx-manifest.toml'` não é erro:**
   É apenas um aviso normal (`INFO`) exibido sempre que você envia arquivos já compilados (`browser.zip` / `kinkconsentmanager-ui.zip`) em vez de deixar o Oryx/Azure compilar o código-fonte no servidor.
2. **Estrutura do `browser.zip`:**
   Quando `index.html`, `assets/` e os chunks `.js`/`.css` estão diretamente na raiz do ZIP, o empacotamento está correto — o problema não está na estrutura dos arquivos.
3. **Por que caiu em `node /opt/startup/default-static-site.js`:**
   No **Azure App Service Linux (Node.js)**, o container **não serve arquivos estáticos (`index.html`) automaticamente**. Quando o runtime não encontra um servidor Node (`server.js` / `package.json`) nem um **Comando de inicialização** configurado no App Service, ele cai no fallback `node /opt/startup/default-static-site.js`, que exibe apenas a página padrão de boas-vindas do Azure e ignora o seu app Angular.
4. **Correção definitiva:** configurar `pm2 serve /home/site/wwwroot --no-daemon --spa` no **Startup Command** (Passo 4) ou incluir um servidor Node nativo (`server.js`) conforme o Passo 6.

---

## Passo 6 — Se o `pm2` der erro na imagem `Node 26` (`v26.13.1`)

Como o App Service **`kinkconsentmanagerapp`** está provisionado em **Node 26 (`v26.13.1`)** no plano **F1 Free**, se após configurar o comando do Passo 4 aparecer erro do `pm2` nos logs de runtime (por exemplo, `pm2: not found`, erro de permissão ou falha de memória/compatibilidade), é possível adotar um **servidor Node nativo (`server.js` com zero dependências externas, ~40 linhas)** para empacotar junto ao `frontend/dist/kinkconsentmanager/browser` (e integrá-lo aos pipelines em [`ci-cd/`](../README.md)).

Vantagens dessa abordagem:
- O Azure detecta e sobe a aplicação automaticamente (`node server.js`) **sem depender de `pm2`** nem de Startup Command complexo;
- Trata nativamente o fallback de rotas SPA (`/checklist`, `/export` → `index.html`) e o endpoint de monitoramento `/health`;
- Consome **menos memória RAM**, sendo mais estável no plano **F1 Free**.

> Caso você execute o Passo 4 e os logs de runtime apontem falha no `pm2`, salve o novo log e solicite a criação do `server.js` nativo integrado ao empacotamento em `ci-cd/`.
