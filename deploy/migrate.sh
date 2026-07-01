#!/usr/bin/env bash
#
# DKS -> PDC deployment migration (rebrand of the systemd service identity).
#
# Migrates an existing "dks" install to the new "pdc" identity WITHOUT moving the
# app directory:
#   - creates the new system user (default: pdc)
#   - re-points the git "origin" remote to the new repository
#   - records SERVICE_NAME/SERVICE_USER in .env so update.sh restarts the right unit
#   - stops/disables the old unit, then (re)builds and installs a new systemd unit
#     (default: pdc-redbot-webapp) by delegating to install-service.sh
#   - installs a polkit rule so the new service user may restart its own unit
#     (needed for the web-panel self-update/restart)
#   - keeps the old unit file and the old user as a fallback (only disabled)
#
# Run ONCE, as root, inside the project folder:
#   sudo bash deploy/migrate.sh
#
# NOTE: There is a short downtime while the app is rebuilt (the old service is
# stopped first so it does not clash with the new one on the same port).
#
# Overridable via env vars (defaults shown):
#   OLD_SERVICE_NAME=dks-dashboard        OLD_SERVICE_USER=dks
#   NEW_SERVICE_NAME=pdc-redbot-webapp    NEW_SERVICE_USER=pdc
#   NEW_ORIGIN_URL=https://github.com/PD-Codes/PDC_Redbot_Webapp.git
#   APP_DIR=<repo root>
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

OLD_SERVICE_NAME="${OLD_SERVICE_NAME:-dks-dashboard}"
OLD_SERVICE_USER="${OLD_SERVICE_USER:-dks}"
NEW_SERVICE_NAME="${NEW_SERVICE_NAME:-pdc-redbot-webapp}"
NEW_SERVICE_USER="${NEW_SERVICE_USER:-pdc}"
NEW_ORIGIN_URL="${NEW_ORIGIN_URL:-https://github.com/PD-Codes/PDC_Redbot_Webapp.git}"

echo "==> App directory   : $APP_DIR"
echo "==> Old service     : $OLD_SERVICE_NAME (user $OLD_SERVICE_USER)"
echo "==> New service     : $NEW_SERVICE_NAME (user $NEW_SERVICE_USER)"
echo "==> New origin URL  : $NEW_ORIGIN_URL"

# ---- Preconditions ---------------------------------------------------------
if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi
if [ "$NEW_SERVICE_NAME" = "$OLD_SERVICE_NAME" ]; then
  echo "New and old service name are identical - nothing to migrate." >&2
  exit 1
fi
if [ ! -f "$SCRIPT_DIR/install-service.sh" ]; then
  echo "install-service.sh not found next to this script." >&2
  exit 1
fi

# ---- 1) New system user ----------------------------------------------------
# install-service.sh would also create it, but we need the user to exist before
# re-pointing the git remote and fixing ownership.
if ! id "$NEW_SERVICE_USER" &>/dev/null; then
  echo "==> Creating system user '$NEW_SERVICE_USER'"
  useradd --system --no-create-home --shell /usr/sbin/nologin "$NEW_SERVICE_USER"
fi

# ---- 2) Re-point git origin to the new repository (idempotent) -------------
if [ -d "$APP_DIR/.git" ]; then
  # git without "dubious ownership" abort and without reading global ignore/attrs.
  GIT=(git -c "safe.directory=$APP_DIR" -c "safe.directory=*" \
       -c "core.excludesFile=/dev/null" -c "core.attributesFile=/dev/null" -C "$APP_DIR")
  CUR_ORIGIN="$("${GIT[@]}" remote get-url origin 2>/dev/null || echo '')"
  if [ "$CUR_ORIGIN" != "$NEW_ORIGIN_URL" ]; then
    echo "==> Migrating origin: ${CUR_ORIGIN:-<none>} -> ${NEW_ORIGIN_URL}"
    if [ -n "$CUR_ORIGIN" ]; then
      "${GIT[@]}" remote set-url origin "$NEW_ORIGIN_URL"
    else
      "${GIT[@]}" remote add origin "$NEW_ORIGIN_URL"
    fi
  fi
fi

# ---- 3) Record service identity in .env ------------------------------------
# update.sh reads SERVICE_NAME/SERVICE_USER from its environment (the service
# process loads .env via EnvironmentFile), so the web self-update restarts the
# NEW unit after migration.
ENV_FILE="$APP_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  grep -q '^SERVICE_NAME=' "$ENV_FILE" || echo "SERVICE_NAME=$NEW_SERVICE_NAME" >> "$ENV_FILE"
  grep -q '^SERVICE_USER=' "$ENV_FILE" || echo "SERVICE_USER=$NEW_SERVICE_USER" >> "$ENV_FILE"
else
  echo "WARNING: $ENV_FILE missing - SERVICE_NAME/SERVICE_USER not recorded." >&2
fi

# ---- 4) Stop the old unit BEFORE building/starting the new one -------------
# Both units would use the same port from .env, so the old one must be down
# first. The unit file and user are kept (only disabled) as a fallback.
if systemctl cat "${OLD_SERVICE_NAME}.service" &>/dev/null; then
  echo "==> Disabling old service '${OLD_SERVICE_NAME}' (kept as fallback)"
  systemctl disable --now "${OLD_SERVICE_NAME}" 2>/dev/null || true
fi

# ---- 5) Build + install the new systemd unit -------------------------------
# Delegates to the (already parameterized) installer: creates/chowns to the new
# user, rebuilds, writes the unit, daemon-reload, enable --now.
echo "==> Building and installing new service via install-service.sh"
APP_DIR="$APP_DIR" SERVICE_USER="$NEW_SERVICE_USER" SERVICE_NAME="$NEW_SERVICE_NAME" \
  bash "$SCRIPT_DIR/install-service.sh"

# ---- 6) polkit rule for the web self-update restart ------------------------
POLKIT_RULE="/etc/polkit-1/rules.d/49-${NEW_SERVICE_NAME}.rules"
if [ -d /etc/polkit-1/rules.d ]; then
  echo "==> Writing polkit rule $POLKIT_RULE"
  cat > "$POLKIT_RULE" <<EOF
// Allow the service user to manage (restart) its own unit - for the web self-update.
polkit.addRule(function(action, subject) {
  if (action.id == "org.freedesktop.systemd1.manage-units" &&
      action.lookup("unit") == "${NEW_SERVICE_NAME}.service" &&
      subject.user == "${NEW_SERVICE_USER}") {
    return polkit.Result.YES;
  }
});
EOF
else
  echo "NOTE: /etc/polkit-1/rules.d not found - skipping polkit rule." >&2
  echo "      Web self-restart may need a sudoers NOPASSWD rule instead." >&2
fi

echo
echo "==> Migration done. New service status:"
systemctl --no-pager --full status "${NEW_SERVICE_NAME}" || true
echo
echo "Old service '${OLD_SERVICE_NAME}' and user '${OLD_SERVICE_USER}' were kept (disabled) as fallback."
echo "Rollback:   sudo systemctl enable --now ${OLD_SERVICE_NAME}  (after stopping the new one)"
echo "Live logs:  journalctl -u ${NEW_SERVICE_NAME} -f"
