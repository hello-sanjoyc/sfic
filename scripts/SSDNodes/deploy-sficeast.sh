#!/usr/bin/env bash
set -Eeuo pipefail

# =========================================================
# SFIC.ARANAX.DEV FULL DEPLOYMENT
#
# Project structure:
#   /var/www/sfic.aranax.dev/sfic/   <- Git repository root
#   ├── web/   -> Next.js      -> 127.0.0.1:3514
#   └── api/   -> Node/Fastify -> 127.0.0.1:3515
#
# Suggested location:
#   /var/www/deploy-sfic.sh
#
# Run as the same non-root Linux user that owns/runs PM2.
# =========================================================

REPO_ROOT="/var/www/sficeast.in/code"
APP_ROOT="$REPO_ROOT"

WEB_DIR="$APP_ROOT/apps/web"
API_DIR="$APP_ROOT/apps/api"

REPO_URL="https://github.com/hello-sanjoyc/sfic.git"
BRANCH="main"

# Change this only if your ecosystem file is stored elsewhere.
ECOSYSTEM_FILE="/var/www/ecosystem.config.js"

WEB_PROCESS="SFICEast-Web"
API_PROCESS="SFICEast-API"

WEB_PORT="3520"
API_PORT="3521"

WEB_HEALTH_URL="http://127.0.0.1:${WEB_PORT}/"

# Leave blank if your Fastify app does not expose a dedicated health endpoint.
# Example:
# API_HEALTH_URL="http://127.0.0.1:${API_PORT}/health"
API_HEALTH_URL=""

BACKUP_ROOT="$HOME/backups/sficeast"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"

# =========================================================
# HELPERS
# =========================================================

log() {
  echo ""
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

die() {
  echo ""
  echo "ERROR: $*" >&2
  exit 1
}

on_error() {
  local exit_code=$?

  echo ""
  echo "=============================================="
  echo "SFIC DEPLOYMENT FAILED"
  echo "Exit code : $exit_code"
  echo "Line      : ${BASH_LINENO[0]}"
  echo "=============================================="

  echo ""
  echo "PM2 status:"
  pm2 status || true

  echo ""
  echo "Recent Next.js logs:"
  pm2 logs "$WEB_PROCESS" --lines 30 --nostream 2>/dev/null || true

  echo ""
  echo "Recent Fastify logs:"
  pm2 logs "$API_PROCESS" --lines 30 --nostream 2>/dev/null || true

  exit "$exit_code"
}

trap on_error ERR

pm2_status() {
  local process_name="$1"

  pm2 jlist | node -e '
    let s = "";
    process.stdin.on("data", d => s += d);
    process.stdin.on("end", () => {
      const p = JSON.parse(s).find(x => x.name === process.argv[1]);
      process.stdout.write(p?.pm2_env?.status || "");
    });
  ' "$process_name"
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-20}"
  local delay="${4:-2}"

  for ((i=1; i<=attempts; i++)); do
    # We only need a valid HTTP response. A 404 still proves the app is listening.
    local code
    code="$(curl \
      --silent \
      --output /dev/null \
      --write-out '%{http_code}' \
      --max-time 5 \
      "$url" || true)"

    if [ "$code" != "000" ] && [ -n "$code" ]; then
      log "$label responded with HTTP $code"
      return 0
    fi

    sleep "$delay"
  done

  die "$label did not respond at $url"
}

# =========================================================
# START
# =========================================================

echo "=============================================="
echo "SFIC.ARANAX.DEV FULL DEPLOYMENT START"
echo "=============================================="

if [ "$(id -u)" -eq 0 ]; then
  die "Do not run this script as root. Run it as the PM2 deployment user."
fi

CURRENT_USER="$(id -un)"
log "Running as user: $CURRENT_USER"

for cmd in git pm2 curl node corepack; do
  command -v "$cmd" >/dev/null 2>&1 \
    || die "$cmd is not installed or is not available in PATH"
done

[ -f "$ECOSYSTEM_FILE" ] || die "PM2 ecosystem file not found: $ECOSYSTEM_FILE"

log "Node version: $(node --version)"
log "PM2 version: $(pm2 --version)"

log "Enabling Corepack / pnpm"
corepack enable
command -v pnpm >/dev/null 2>&1 \
  || die "pnpm not found after corepack enable"

log "pnpm version: $(pnpm --version)"

# =========================================================
# SAVE CURRENT ENV FILES
# =========================================================

log "Creating deployment backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

[ -f "$WEB_DIR/.env" ] && cp -p "$WEB_DIR/.env" "$BACKUP_DIR/web.env" || true
[ -f "$API_DIR/.env" ] && cp -p "$API_DIR/.env" "$BACKUP_DIR/api.env" || true

# =========================================================
# UPDATE SOURCE CODE
# =========================================================

log "Updating source code from GitHub"
log "Repository: $REPO_URL"
log "Branch    : $BRANCH"

mkdir -p "$(dirname "$REPO_ROOT")"

if [ ! -d "$REPO_ROOT/.git" ]; then
  if [ -d "$REPO_ROOT" ] && [ "$(find "$REPO_ROOT" -mindepth 1 -maxdepth 1 2>/dev/null | head -n 1)" ]; then
    die "$REPO_ROOT exists and is not an empty Git repository. Move/remove its contents before the first deployment."
  fi

  log "Cloning repository into $REPO_ROOT"
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$REPO_ROOT"
else
  cd "$REPO_ROOT"

  if git remote get-url origin >/dev/null 2>&1; then
    CURRENT_ORIGIN="$(git remote get-url origin)"

    if [ "$CURRENT_ORIGIN" != "$REPO_URL" ]; then
      log "Updating Git origin from $CURRENT_ORIGIN to $REPO_URL"
      git remote set-url origin "$REPO_URL"
    fi
  else
    log "Adding Git origin: $REPO_URL"
    git remote add origin "$REPO_URL"
  fi

  git fetch --prune origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
  git clean -fd
fi

cd "$REPO_ROOT"

[ -d "$APP_ROOT" ] || die "Application directory not found after Git update: $APP_ROOT"
[ -d "$WEB_DIR" ] || die "Next.js directory not found: $WEB_DIR"
[ -d "$API_DIR" ] || die "Fastify API directory not found: $API_DIR"

[ -f "$WEB_DIR/package.json" ] || die "Next.js package.json not found: $WEB_DIR/package.json"
[ -f "$API_DIR/package.json" ] || die "Fastify package.json not found: $API_DIR/package.json"

# Restore production env files if a repository operation removed them.
if [ ! -f "$WEB_DIR/.env" ] && [ -f "$BACKUP_DIR/web.env" ]; then
  cp -p "$BACKUP_DIR/web.env" "$WEB_DIR/.env"
fi

if [ ! -f "$API_DIR/.env" ] && [ -f "$BACKUP_DIR/api.env" ]; then
  cp -p "$BACKUP_DIR/api.env" "$API_DIR/.env"
fi

# =========================================================
# INSTALL DEPENDENCIES
# =========================================================

echo ""
echo "=============================================="
echo "DEPENDENCY INSTALL START"
echo "=============================================="

# Support either:
#   A) a pnpm workspace rooted at /sfic
#   B) independent web/api pnpm projects
if [ -f "$APP_ROOT/pnpm-workspace.yaml" ] || [ -f "$APP_ROOT/pnpm-lock.yaml" ]; then
  log "Detected pnpm workspace/root lockfile at $APP_ROOT"

  cd "$APP_ROOT"

  if [ -f pnpm-lock.yaml ]; then
    pnpm install --frozen-lockfile
  else
    pnpm install
  fi
else
  log "No root pnpm workspace detected; installing web and api separately"

  cd "$WEB_DIR"
  if [ -f pnpm-lock.yaml ]; then
    pnpm install --frozen-lockfile
  else
    pnpm install
  fi

  cd "$API_DIR"
  if [ -f pnpm-lock.yaml ]; then
    pnpm install --frozen-lockfile
  else
    pnpm install
  fi
fi

# =========================================================
# NEXT.JS BUILD
# =========================================================

echo ""
echo "=============================================="
echo "NEXT.JS WEB BUILD START"
echo "=============================================="

cd "$WEB_DIR"

[ -f .env ] || die "Next.js .env not found: $WEB_DIR/.env"

rm -rf .next
NODE_ENV=production pnpm build

[ -d "$WEB_DIR/.next" ] \
  || die "Next.js build completed but .next directory was not created"

# =========================================================
# FASTIFY API BUILD
# =========================================================

echo ""
echo "=============================================="
echo "FASTIFY API BUILD START"
echo "=============================================="

cd "$API_DIR"

[ -f .env ] || die "Fastify .env not found: $API_DIR/.env"

# Remove common TypeScript build output directories.
rm -rf dist build

NODE_ENV=production pnpm build

# Do not hard-code dist/server.js here because the PM2 ecosystem file
# is the source of truth for the API entry point.

# =========================================================
# PM2 DEPLOYMENT
# =========================================================

echo ""
echo "=============================================="
echo "PM2 APPLICATION RELOAD"
echo "=============================================="

if pm2 describe "$WEB_PROCESS" >/dev/null 2>&1; then
  log "Reloading $WEB_PROCESS"
  pm2 reload "$ECOSYSTEM_FILE" --only "$WEB_PROCESS" --update-env
else
  log "Starting $WEB_PROCESS"
  pm2 start "$ECOSYSTEM_FILE" --only "$WEB_PROCESS"
fi

if pm2 describe "$API_PROCESS" >/dev/null 2>&1; then
  log "Reloading $API_PROCESS"
  pm2 reload "$ECOSYSTEM_FILE" --only "$API_PROCESS" --update-env
else
  log "Starting $API_PROCESS"
  pm2 start "$ECOSYSTEM_FILE" --only "$API_PROCESS"
fi

# =========================================================
# VERIFY PM2
# =========================================================

log "Waiting for applications to initialize"
sleep 5

pm2 describe "$WEB_PROCESS" >/dev/null 2>&1 \
  || die "$WEB_PROCESS is not registered in PM2"

pm2 describe "$API_PROCESS" >/dev/null 2>&1 \
  || die "$API_PROCESS is not registered in PM2"

WEB_STATUS="$(pm2_status "$WEB_PROCESS")"
API_STATUS="$(pm2_status "$API_PROCESS")"

[ "$WEB_STATUS" = "online" ] \
  || die "$WEB_PROCESS PM2 status is '$WEB_STATUS'"

[ "$API_STATUS" = "online" ] \
  || die "$API_PROCESS PM2 status is '$API_STATUS'"

log "$WEB_PROCESS is online"
log "$API_PROCESS is online"

# =========================================================
# HTTP HEALTH CHECKS
# =========================================================

log "Checking Next.js on port $WEB_PORT"
wait_for_http "$WEB_HEALTH_URL" "Next.js frontend"

if [ -n "$API_HEALTH_URL" ]; then
  log "Checking Fastify health endpoint"
  wait_for_http "$API_HEALTH_URL" "Fastify API"
else
  log "Checking Fastify listener on port $API_PORT"

  # An HTTP response of any status confirms Fastify is reachable.
  wait_for_http "http://127.0.0.1:${API_PORT}/" "Fastify API"
fi

# =========================================================
# SAVE PM2 PROCESS LIST
# =========================================================

log "Saving PM2 process list"
pm2 save

# =========================================================
# COMPLETE
# =========================================================

echo ""
echo "=============================================="
echo "SFIC.ARANAX.DEV FULL DEPLOYMENT COMPLETE"
echo "=============================================="
echo "Git repository       : $REPO_URL"
echo "Repository root      : $REPO_ROOT"
echo "Application root     : $APP_ROOT"
echo "Git branch           : $BRANCH"
echo "Next.js directory    : $WEB_DIR"
echo "Fastify directory    : $API_DIR"
echo "Next.js PM2 process  : $WEB_PROCESS"
echo "Fastify PM2 process  : $API_PROCESS"
echo "Next.js port         : $WEB_PORT"
echo "Fastify port         : $API_PORT"
echo "Environment backup   : $BACKUP_DIR"
echo ""

pm2 status
