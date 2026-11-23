#!/usr/bin/env bash
# ==============================================================================
# Script portável de CI — KinkConsentManager UI
# Uso em Jenkins, Bitbucket Pipelines, CircleCI, TeamCity ou execução local CI:
#   bash ci-cd/scripts/ci-build-test.sh
# Variáveis opcionais:
#   SKIP_INSTALL=true|false     (padrão: false)
#   RUN_SECURITY_AUDIT=true|false (padrão: true)
#   RUN_SONAR=true|false        (padrão: false; requer SONAR_TOKEN e sonar-scanner)
#   ARCHIVE_ARTIFACT=true|false (padrão: true; gera zip do SPA para Azure Web App)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/frontend"
DIST_BROWSER_DIR="${FRONTEND_DIR}/dist/kinkconsentmanager/browser"
OUT_DIR="${REPO_ROOT}/ci-cd/out"

SKIP_INSTALL="${SKIP_INSTALL:-false}"
RUN_SECURITY_AUDIT="${RUN_SECURITY_AUDIT:-true}"
RUN_SONAR="${RUN_SONAR:-false}"
ARCHIVE_ARTIFACT="${ARCHIVE_ARTIFACT:-true}"

echo "[CI] Repositório: ${REPO_ROOT}"
echo "[CI] Node.js: $(node -v) | npm: $(npm -v)"

cd "${FRONTEND_DIR}"

if [ "${SKIP_INSTALL}" != "true" ]; then
  echo "[CI] 1/5 Instalando dependências (npm ci)..."
  npm ci
fi

if [ "${RUN_SECURITY_AUDIT}" = "true" ]; then
  echo "[CI] 2/5 Executando npm audit (high/critical, não bloqueante)..."
  npm audit --audit-level=high --omit=dev || echo "[AVISO] Vulnerabilidades detectadas no npm audit."
fi

echo "[CI] 3/5 Executando build de produção (npm run build:prod)..."
npm run build:prod

echo "[CI] 4/5 Executando testes unitários e cobertura (npm run test:ci)..."
npm run test:ci

echo "[CI] 5/5 Validando relatórios e artefatos gerados..."
REQUIRED_FILES=(
  "${FRONTEND_DIR}/coverage/cobertura-coverage.xml"
  "${FRONTEND_DIR}/coverage/lcov.info"
  "${FRONTEND_DIR}/coverage/junit/test-results.xml"
  "${FRONTEND_DIR}/coverage/sonar/sonar-report.xml"
  "${DIST_BROWSER_DIR}/index.html"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "${file}" ]; then
    echo "[ERRO] Artefato esperado não encontrado: ${file}" >&2
    exit 1
  fi
  echo "  [OK] ${file}"
done

if [ "${RUN_SONAR}" = "true" ]; then
  if [ -z "${SONAR_TOKEN:-}" ]; then
    echo "[ERRO] RUN_SONAR=true requer variável SONAR_TOKEN definida." >&2
    exit 1
  fi
  echo "[CI] Executando SonarCloud Scanner..."
  cd "${REPO_ROOT}"
  sonar-scanner -Dproject.settings=frontend/sonar-project.properties
fi

if [ "${ARCHIVE_ARTIFACT}" = "true" ]; then
  mkdir -p "${OUT_DIR}"
  ARCHIVE_PATH="${OUT_DIR}/kinkconsentmanager-ui.zip"
  rm -f "${ARCHIVE_PATH}"
  if command -v zip >/dev/null 2>&1; then
    (cd "${DIST_BROWSER_DIR}" && zip -rq "${ARCHIVE_PATH}" .)
    echo "[CI] Pacote SPA gerado em: ${ARCHIVE_PATH}"
  else
    TAR_PATH="${OUT_DIR}/kinkconsentmanager-ui.tar.gz"
    tar -czf "${TAR_PATH}" -C "${DIST_BROWSER_DIR}" .
    echo "[CI] zip indisponível; pacote tar.gz gerado em: ${TAR_PATH}"
  fi
fi

echo "[CI] Pipeline concluído com sucesso."
