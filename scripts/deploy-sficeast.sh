#!/usr/bin/env bash
#
# SFIC East production deployment script
# RHEL 9 + PNPM + PM2
#
# Source code location:
#   /usr/share/nginx/html/sficeast
#
# Expected monorepo structure:
#   /usr/share/nginx/html/sficeast/
#   ├── apps/
#   │   ├── api/
#   │   └── web/
#   ├── package.json
#   ├── pnpm-lock.yaml
#   ├── pnpm-workspace.yaml
#   └── ecosystem.config.js
#
# Runtime ports:
#   Next.js Web : 127.0.0.1:3000
#   Fastify API : 127.0.0.1:4000
#
# Run this script as the same non-root Linux user that owns/runs the PM2 processes.
#

set -Eeuo pipefail
umask 027

APP_ROOT="/usr/share/nginx/html/sficeast"
WEB_DIR="${APP_ROOT}/apps/web"
API_DIR="${APP_ROOT}/apps/api"
ECOSYSTEM_FILE="${APP_ROOT}/ecosystem.config.js"

WEB_PORT="3000"
API_PORT="4000"

LOG_ROOT="${APP_ROOT}/logs"
WEB_LOG_DIR="${LOG_ROOT}/web"
API_LOG_DIR="${LOG_ROOT}/api"
DEPLOY_LOG="${LOG_ROOT}/deploy.log"

LOCK_FILE="/tmp/sficeast-deploy.lock"

timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log() {
    echo "[$(timestamp)] $*" | tee -a "${DEPLOY_LOG}"
}

fail() {
    log "ERROR: $*"
    exit 1
}

on_error() {
    local exit_code=$?
    local line_no=$1
    log "Deployment failed at line ${line_no} with exit code ${exit_code}."
    log "Existing PM2 processes were not intentionally stopped."
    exit "${exit_code}"
}

trap 'on_error $LINENO' ERR

# Prevent simultaneous deployments
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
    echo "Another SFIC East deployment is already running."
    exit 1
fi

# Validate project structure
[[ -d "${APP_ROOT}" ]] || fail "Application root does not exist: ${APP_ROOT}"
[[ -d "${WEB_DIR}" ]] || fail "Next.js app directory does not exist: ${WEB_DIR}"
[[ -d "${API_DIR}" ]] || fail "Fastify API directory does not exist: ${API_DIR}"
[[ -f "${APP_ROOT}/package.json" ]] || fail "Root package.json not found."
[[ -f "${APP_ROOT}/pnpm-lock.yaml" ]] || fail "pnpm-lock.yaml not found."
[[ -f "${APP_ROOT}/pnpm-workspace.yaml" ]] || fail "pnpm-workspace.yaml not found."
[[ -f "${ECOSYSTEM_FILE}" ]] || fail "PM2 ecosystem file not found: ${ECOSYSTEM_FILE}"

mkdir -p "${WEB_LOG_DIR}" "${API_LOG_DIR}"
touch "${DEPLOY_LOG}"

log "============================================================"
log "Starting SFIC East production deployment"
log "Application root: ${APP_ROOT}"
log "User: $(id -un)"
log "Web port: ${WEB_PORT}"
log "API port: ${API_PORT}"
log "============================================================"

# Validate executables
command -v node >/dev/null 2>&1 || fail "Node.js is not installed or not in PATH."
command -v pnpm >/dev/null 2>&1 || fail "PNPM is not installed or not in PATH."
command -v pm2 >/dev/null 2>&1 || fail "PM2 is not installed or not in PATH."

log "Node.js: $(node --version)"
log "PNPM: $(pnpm --version)"
log "PM2: $(pm2 --version)"

cd "${APP_ROOT}"

# Install dependencies for the monorepo
log "Installing PNPM workspace dependencies..."
pnpm install --frozen-lockfile

# Build API
log "Building Fastify API..."
cd "${API_DIR}"
rm -rf dist
pnpm run build

[[ -d "${API_DIR}/dist" ]] || fail "API build completed but dist/ was not created."

if [[ ! -f "${API_DIR}/dist/server.js" ]]; then
    log "WARNING: ${API_DIR}/dist/server.js was not found."
    log "Verify the SFIC-API script path in ecosystem.config.js."
fi

# Build Next.js
log "Building Next.js web application..."
cd "${WEB_DIR}"
rm -rf .next
pnpm run build

[[ -d "${WEB_DIR}/.next" ]] || fail "Next.js build completed but .next/ was not created."

# Start or reload using PM2
cd "${APP_ROOT}"
log "Deploying applications with PM2..."

if pm2 describe "SFIC-Web" >/dev/null 2>&1 || pm2 describe "SFIC-API" >/dev/null 2>&1; then
    log "Existing SFIC PM2 process found. Performing reload..."
    pm2 reload "${ECOSYSTEM_FILE}" --update-env
else
    log "No existing SFIC PM2 processes found. Starting applications..."
    pm2 start "${ECOSYSTEM_FILE}" --update-env
fi

log "Saving PM2 process list..."
pm2 save

# Health checks
log "Waiting for services to become ready..."
sleep 5

WEB_OK=0
API_OK=0

if command -v curl >/dev/null 2>&1; then
    if curl --fail --silent --show-error --max-time 10 \
        "http://127.0.0.1:${WEB_PORT}/" >/dev/null; then
        WEB_OK=1
        log "Next.js health check passed on 127.0.0.1:${WEB_PORT}."
    else
        log "WARNING: Next.js health check failed on 127.0.0.1:${WEB_PORT}."
    fi

    API_STATUS="$(curl --silent --output /dev/null --max-time 10 \
        --write-out '%{http_code}' "http://127.0.0.1:${API_PORT}/health" || true)"

    if [[ "${API_STATUS}" =~ ^[1-5][0-9][0-9]$ ]]; then
        API_OK=1
        log "Fastify API responded on 127.0.0.1:${API_PORT} with HTTP ${API_STATUS}."
    else
        log "WARNING: Fastify API did not respond on 127.0.0.1:${API_PORT}."
    fi
else
    log "WARNING: curl is not installed; skipping HTTP health checks."
fi

log "Current PM2 status:"
pm2 status | tee -a "${DEPLOY_LOG}"

if [[ "${WEB_OK}" -eq 0 || "${API_OK}" -eq 0 ]]; then
    log "Deployment/build completed, but one or more health checks need review."
    log "Check: pm2 logs SFIC-Web --lines 100"
    log "Check: pm2 logs SFIC-API --lines 100"
    exit 2
fi

log "============================================================"
log "SFIC East deployment completed successfully."
log "Web: https://sficeast.wb.gov.in/"
log "API: https://sficeast.wb.gov.in/api/"
log "Internal Web: http://127.0.0.1:${WEB_PORT}"
log "Internal API: http://127.0.0.1:${API_PORT}"
log "============================================================"
