# Conjunto Homologado — Ciclo 2026-11-22 (KinkConsentManager Frontend V1)

**Data:** 2026-11-22  
**Guia Genérico Base:** [GuiaGenericoAtualizacaoPacotesFrontend.md](./GuiaGenericoAtualizacaoPacotesFrontend.md)  
**Guia Específico:** [GuiaAtualizacaoPacotes-KinkConsentManagerUI.md](./GuiaAtualizacaoPacotes-KinkConsentManagerUI.md)  
**Escopo Oficial V1:** Aplicação única 100% client-side em [frontend/](../../../frontend) (`kinkconsentmanager` — Módulo de Checklist e Exportação).  
*(Nota: O futuro Backend Node.js da V2 e os demais módulos de roadmap permanecem fora do escopo da V1.)*

---

## 1. Matriz de Dependências Homologadas (`frontend/package.json`)

### 1.1 Dependências de Produção (`dependencies`)

| Pacote | Versão Declarada | Status / Observações |
| ------ | ---------------- | -------------------- |
| `@angular/common` | `^22.1.0` | Core Angular 22 (Standalone + Signals) |
| `@angular/compiler` | `^22.1.0` | Core Angular 22 |
| `@angular/core` | `^22.1.0` | Core Angular 22 |
| `@angular/forms` | `^22.1.0` | Reactive/Template Forms para PrimeNG |
| `@angular/platform-browser` | `^22.1.0` | Runtime Browser Angular 22 |
| `@angular/router` | `^22.1.0` | Roteamento lazy (`/checklist`, `/export`) |
| `@angular/cdk` | `^22.3.0` | Peer requirement de `primeng@22.1.5` |
| `primeng` | `^22.1.5` | Suite de componentes UI |
| `@primeuix/themes` | `^3.1.1` | Tema oficial `Aura` |
| `primeicons` | `^8.0.2` | Ícones acessíveis usados nas escalas e UI |
| `@ngx-translate/core` | `^18.1.0` | Internacionalização reativa (`pt-BR` / `en-US`) |
| `@ngx-translate/http-loader` | `^18.1.0` | Loader HTTP de traduções (`assets/i18n/`) |
| `html-to-image` | `^1.11.13` | Exportação PNG client-side em chunk lazy |
| `pdfmake` | `^0.3.15` | Exportação PDF programática (`addVirtualFileSystem`) em chunk lazy |
| `rxjs` | `~7.8.0` | Programação reativa / HTTP / repositórios |
| `tslib` | `^2.3.0` | Helpers TypeScript |

### 1.2 Dependências de Desenvolvimento (`devDependencies`)

| Pacote | Versão Declarada | Status / Observações |
| ------ | ---------------- | -------------------- |
| `@angular/build` | `^22.1.2` | Builder `@angular/build:application` |
| `@angular/cli` | `^22.1.2` | Angular CLI `22.1.2` |
| `@angular/compiler-cli` | `^22.1.0` | Compilador AOT e `strictTemplates` |
| `typescript` | `~6.0.2` | **Trava mantida:** exigido pelo Angular 22 |
| `jest` | `^30.5.2` | Runner de testes unitários (`jest-preset-angular`) |
| `jest-environment-jsdom` | `^30.5.2` | Environment `jsdom` para execução Jest |
| `jest-preset-angular` | `^17.0.3` | Preset Angular 22 (`setupZonelessTestEnv`) |
| `@types/jest` | `^30.0.0` | Tipagens TypeScript para Jest (`tsconfig.spec.json`) |
| `@types/node` | `^26.6.6` | Tipagens Node.js para specs/tooling |
| `jest-junit` | `^17.0.0` | Relatório JUnit XML em `coverage/junit/test-results.xml` |
| `jest-html-reporter` | `^4.4.3` | Relatório HTML em `coverage/html/test-report.html` |
| `jest-sonar` | `^0.2.16` | Relatório Sonar XML em `coverage/sonar/sonar-report.xml` |
| `jest-stare` | `^2.5.3` | Relatório `jest-stare` em `coverage/jest-stare/index.html` |
| `jest-html-reporters` | `^3.1.7` | Relatório HTML em `coverage/jest-html-reporters/test-report.html` |
| `jsdom` | `^28.0.0` | Ambiente DOM para testes Jest |
| `@types/pdfmake` | `^0.3.3` | Tipagens TypeScript para `pdfmake` 0.3.x |
| `prettier` | `^3.8.1` | Padronização de formatação |

---

## 2. Validações e Evidências Executadas em `2026-11-22`

### 2.1 Compilação TypeScript Estrita e Produção

```text
1. TypeScript App & Spec (strict: true, strictTemplates: true):
   npx.cmd tsc -p tsconfig.app.json --noEmit  -> 0 erros
   npx.cmd tsc -p tsconfig.spec.json --noEmit -> 0 erros

2. Build de Produção (npm.cmd run build:prod):
   Concluído com código de saída 0 em frontend/dist/kinkconsentmanager (7.556s)
   - Initial total: 744.99 kB raw (161.09 kB transfer)
   - Lazy chunks: checklist-routes (99.65 kB), export-routes (48.97 kB),
                  pdfmake (852.76 kB), vfs_fonts (854.76 kB)
   - Assets emitidos: assets/schemas/checklist-v1.json,
                      assets/i18n/pt-BR.json, assets/i18n/en-US.json
   - Warnings conhecidos: initial > 500 kB (abaixo do erro 1 MB) e 2 avisos CommonJS
     dos chunks lazy de pdfmake/vfs_fonts.
```

### 2.2 Testes Automatizados e Cobertura (`npm.cmd run test:coverage`)

```text
Runner: Jest 30.5.2 + jest-preset-angular 17.0.3 + jest-environment-jsdom 30.5.2 (zoneless)
Test Suites: 29 passed, 29 total
Tests:       150 passed, 150 total (0 failed, 5.219s)
Coverage Global (All files):
  - Statements: 92.18% (1509/1637)
  - Branches:   75.38% (683/906)
  - Functions:  89.40% (329/368)
  - Lines:      91.84% (1431/1558)
Relatórios gerados:
  - frontend/coverage/lcov.info (47.264 bytes)
  - frontend/coverage/sonar/sonar-report.xml (23.365 bytes)
  - frontend/coverage/junit/test-results.xml (43.174 bytes)
  - frontend/coverage/html/test-report.html (60.056 bytes)
  - frontend/coverage/jest-stare/index.html (175.888 bytes)
  - frontend/coverage/jest-html-reporters/test-report.html (3.118 bytes)
```

### 2.3 Auditoria de Segurança (`npm.cmd audit --omit=dev`)

```text
frontend/: found 0 vulnerabilities
```

---

## 3. Conclusão e Próximos Pontos de Atenção

- O baseline V1 do **KinkConsentManager** está 100% homologado em `frontend/` com **0 vulnerabilidades de produção**, **150/150 testes unitários aprovados no Jest 30**, **91,84% de cobertura de linhas** (**92,18% statements**) e build de produção validado.
- **Ações recomendadas para o próximo ciclo de manutenção:**
  1. Avaliar adição de `@angular-eslint` / `eslint` para cobertura completa de Code Smells em lint local/CI.
  2. Elevar `checklist-view.helpers.ts` (`76,59%`), `pdf-export.service.ts` (`73,68%`) e `scale-selector.component.ts` (`80,85%`) para acima de `85%` de cobertura.
