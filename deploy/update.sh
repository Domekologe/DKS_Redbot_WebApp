#!/usr/bin/env bash
#
# DKS Redbot WebApp – Update/Redeploy: Code holen, neu bauen, Dienst neu starten.
#
# Nutzung (im Projektordner):
#   sudo bash deploy/update.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
SERVICE_USER="${SERVICE_USER:-dks}"
SERVICE_NAME="${SERVICE_NAME:-dks-dashboard}"

cd "$APP_DIR"

# Optional: aktuellen Code holen (nur wenn es ein Git-Repo ist)
if [ -d .git ]; then
  echo "==> git pull"
  sudo -u "$SERVICE_USER" git pull --ff-only || git pull --ff-only
fi

echo "==> Build"
NPM_CACHE="$APP_DIR/.npm-cache"
mkdir -p "$NPM_CACHE"
chown -R "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR" 2>/dev/null || true
NPM_ENV=(HOME="$APP_DIR" XDG_CACHE_HOME="$APP_DIR/.cache" npm_config_cache="$NPM_CACHE")
if ! sudo -u "$SERVICE_USER" env "${NPM_ENV[@]}" npm ci; then
  sudo -u "$SERVICE_USER" env "${NPM_ENV[@]}" npm install
fi
sudo -u "$SERVICE_USER" env "${NPM_ENV[@]}" npm run build

# Marker für das Web-Panel: Build erfolgreich abgeschlossen (vor dem Neustart).
echo "===UPDATE_DONE==="

echo "==> Dienst neu starten"
systemctl restart "${SERVICE_NAME}"
systemctl --no-pager --full status "${SERVICE_NAME}" || true
