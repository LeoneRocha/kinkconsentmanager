#!/usr/bin/env bash
# ==============================================================================
# Script portável de CI — KinkConsentManager (Frontend + Backend)
# Uso em Jenkins, Bitbucket Pipelines, CircleCI, TeamCity ou execução local CI:
#   bash ci-cd/scripts/ci-build-test.sh
# Variáveis opcionais:
#   RUN_FRONTEND=true|false       (padrão: true)
#   RUN_BACKEND=true|false        (padrão: true)
#   RUN_BACKEND_DOCKER=true|false (padrão: false — build Docker desativado por padrão)
#   SKIP_INSTALL=true|false       (padrão: false)
#   RUN_SECURITY_AUDIT=true|false (padrão: true)
#   RUN_SONAR=true|false          (padrão: false; requer SONAR_TOKEN e sonar-scanner)
#   ARCHIVE_ARTIFACT=true|false   (padrão: true; gera zip do SPA e da API)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/frontend"
DIST_BROWSER_DIR="${FRONTEND_DIR}/dist/kinkconsentmanager/browser"
BACKEND_DIR="${REPO_ROOT}/backend"
BACKEND_SLN="${BACKEND_DIR}/KinkConsentManager.sln"
BACKEND_API_PROJECT="${BACKEND_DIR}/APIs/KinkConsentManager.API/KinkConsentManager.API.csproj"
OUT_DIR="${REPO_ROOT}/ci-cd/out"

RUN_FRONTEND="${RUN_FRONTEND:-true}"
RUN_BACKEND="${RUN_BACKEND:-true}"
RUN_BACKEND_DOCKER="${RUN_BACKEND_DOCKER:-false}"
SKIP_INSTALL="${SKIP_INSTALL:-false}"
RUN_SECURITY_AUDIT="${RUN_SECURITY_AUDIT:-true}"
RUN_SONAR="${RUN_SONAR:-false}"
ARCHIVE_ARTIFACT="${ARCHIVE_ARTIFACT:-true}"

echo "[CI] Repositório: ${REPO_ROOT}"

if [ "${RUN_FRONTEND}" = "true" ]; then
  echo "[CI][Frontend] Node.js: $(node -v) | npm: $(npm -v)"
  cd "${FRONTEND_DIR}"

  if [ "${SKIP_INSTALL}" != "true" ]; then
    echo "[CI][Frontend] 1/5 Instalando dependências (npm ci)..."
    npm ci
  fi

  if [ "${RUN_SECURITY_AUDIT}" = "true" ]; then
    echo "[CI][Frontend] 2/5 Executando npm audit (high/critical, não bloqueante)..."
    npm audit --audit-level=high --omit=dev || echo "[AVISO] Vulnerabilidades detectadas no npm audit."
  fi

  echo "[CI][Frontend] 3/5 Executando build de produção (npm run build:prod)..."
  npm run build:prod

  echo "[CI][Frontend] 4/5 Executando testes unitários e cobertura (npm run test:ci)..."
  npm run test:ci

  echo "[CI][Frontend] 5/5 Validando relatórios e artefatos gerados..."
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
    echo "[CI][Frontend] Executando SonarCloud Scanner..."
    cd "${REPO_ROOT}"
    sonar-scanner -Dproject.settings=frontend/sonar-project.properties
  fi

  if [ "${ARCHIVE_ARTIFACT}" = "true" ]; then
    mkdir -p "${OUT_DIR}"
    ARCHIVE_PATH="${OUT_DIR}/kinkconsentmanager-ui.zip"
    rm -f "${ARCHIVE_PATH}"
    if command -v zip >/dev/null 2>&1; then
      (cd "${DIST_BROWSER_DIR}" && zip -rq "${ARCHIVE_PATH}" .)
      echo "[CI][Frontend] Pacote SPA gerado em: ${ARCHIVE_PATH}"
    else
      TAR_PATH="${OUT_DIR}/kinkconsentmanager-ui.tar.gz"
      tar -czf "${TAR_PATH}" -C "${DIST_BROWSER_DIR}" .
      echo "[CI][Frontend] zip indisponível; pacote tar.gz gerado em: ${TAR_PATH}"
    fi
  fi
fi

if [ "${RUN_BACKEND}" = "true" ]; then
  echo "[CI][Backend] .NET SDK: $(dotnet --version)"
  cd "${BACKEND_DIR}"

  if [ "${SKIP_INSTALL}" != "true" ]; then
    echo "[CI][Backend] 1/4 Restaurando dependências (dotnet restore)..."
    dotnet restore "${BACKEND_SLN}"
  fi

  echo "[CI][Backend] 2/4 Executando build Release (dotnet build)..."
  dotnet build "${BACKEND_SLN}" -c Release --no-restore

  echo "[CI][Backend] 3/4 Executando testes NUnit e cobertura (dotnet test)..."
  rm -rf "${BACKEND_DIR}/TestResults"
  dotnet test "${BACKEND_SLN}" -c Release --no-build \
    --logger "trx;LogFilePrefix=test-results" \
    --results-directory "${BACKEND_DIR}/TestResults" \
    --collect:"XPlat Code Coverage"

  echo "[CI][Backend] 4/4 Validando relatórios TRX e Cobertura XML..."
  TRX_COUNT="$(find "${BACKEND_DIR}/TestResults" -name '*.trx' | wc -l)"
  COV_COUNT="$(find "${BACKEND_DIR}/TestResults" -name 'coverage.cobertura.xml' | wc -l)"
  if [ "${TRX_COUNT}" -lt 1 ] || [ "${COV_COUNT}" -lt 1 ]; then
    echo "[ERRO] Relatórios TRX (${TRX_COUNT}) ou Cobertura XML (${COV_COUNT}) não encontrados." >&2
    exit 1
  fi
  echo "  [OK] ${TRX_COUNT} arquivo(s) TRX e ${COV_COUNT} arquivo(s) coverage.cobertura.xml em ${BACKEND_DIR}/TestResults"

  if [ "${ARCHIVE_ARTIFACT}" = "true" ]; then
    PUBLISH_DIR="${BACKEND_DIR}/publish/api"
    rm -rf "${PUBLISH_DIR}"
    dotnet publish "${BACKEND_API_PROJECT}" -c Release --no-build /p:UseAppHost=false -o "${PUBLISH_DIR}"
    if [ ! -f "${PUBLISH_DIR}/KinkConsentManager.API.dll" ]; then
      echo "[ERRO] KinkConsentManager.API.dll não encontrado em ${PUBLISH_DIR}" >&2
      exit 1
    fi

    mkdir -p "${OUT_DIR}"
    API_ARCHIVE_PATH="${OUT_DIR}/kinkconsentmanager-api.zip"
    rm -f "${API_ARCHIVE_PATH}"
    if command -v zip >/dev/null 2>&1; then
      (cd "${PUBLISH_DIR}" && zip -rq "${API_ARCHIVE_PATH}" .)
      echo "[CI][Backend] Pacote API gerado em: ${API_ARCHIVE_PATH}"
    else
      API_TAR_PATH="${OUT_DIR}/kinkconsentmanager-api.tar.gz"
      tar -czf "${API_TAR_PATH}" -C "${PUBLISH_DIR}" .
      echo "[CI][Backend] zip indisponível; pacote tar.gz gerado em: ${API_TAR_PATH}"
    fi
  fi
fi

if [ "${RUN_BACKEND_DOCKER}" = "true" ]; then
  echo "[CI][Backend][Docker] Build da imagem kinkconsentmanager-api:local..."
  docker build -f "${BACKEND_DIR}/APIs/KinkConsentManager.API/Dockerfile" -t kinkconsentmanager-api:local "${BACKEND_DIR}"
fi

echo "[CI] Pipeline concluído com sucesso."
