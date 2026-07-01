# Deploy — Linux-Service (systemd)

> 🇩🇪 Deutsch — 🇬🇧 English below.

## 🇩🇪 Schnellstart (Copy/Paste)

Auf dem Server, im Projektordner (z. B. `/opt/dks/redbot-dks-dashboard`):

```bash
# 1) .env anlegen und ausfüllen (einmalig)
cp .env.example .env && nano .env

# 2) Service bauen + einrichten + starten
sudo bash deploy/install-service.sh
```

Das Skript ist **idempotent**: legt bei Bedarf den System-User `dks` an, baut die App
(`npm ci && npm run build`), schreibt die systemd-Unit, aktiviert und startet sie.

Anpassbar über Umgebungsvariablen:
```bash
APP_DIR=/opt/dks/redbot-dks-dashboard SERVICE_USER=dks SERVICE_NAME=dks-dashboard \
  sudo -E bash deploy/install-service.sh
```

**Danach:**
```bash
journalctl -u dks-dashboard -f          # Live-Logs
sudo systemctl restart dks-dashboard    # Neustart
sudo bash deploy/update.sh              # Update: pull + build + restart
```

### Wichtig
- Der Dienst lädt die `.env` über `EnvironmentFile=` (deshalb braucht `node build` hier
  **kein** dotenv).
- Hinter HTTPS-Reverse-Proxy in die `.env`:
  `ORIGIN=https://deine-domain`, `PROTOCOL_HEADER=x-forwarded-proto`,
  `HOST_HEADER=x-forwarded-host`.
- `.env`-Format für systemd: pro Zeile `KEY=value`, **ohne** `export`, ohne Anführungszeichen.

### Manuell (ohne Skript)
`dks-dashboard.service` nach `/etc/systemd/system/` kopieren, Pfade/User anpassen, dann:
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now dks-dashboard
```

### Migration dks -> pdc (einmalig)
Um eine bestehende `dks`-Installation auf die neue `pdc`-Identität umzustellen
(neuer System-User, neuer Service-Name, `origin` auf das neue Repo), gibt es
`deploy/migrate.sh`. Es laesst das App-Verzeichnis am Ort und behaelt den alten
Service/User deaktiviert als Fallback. **Einmalig mit root ausfuehren:**
```bash
sudo bash deploy/migrate.sh
```
Anpassbar ueber Umgebungsvariablen (Defaults):
```bash
NEW_SERVICE_NAME=pdc-redbot-webapp NEW_SERVICE_USER=pdc \
OLD_SERVICE_NAME=dks-dashboard OLD_SERVICE_USER=dks \
  sudo -E bash deploy/migrate.sh
```
Hinweis: Waehrend des Rebuilds gibt es eine kurze Downtime (der alte Dienst wird
zuerst gestoppt). Rollback: `sudo systemctl enable --now dks-dashboard` (nachdem
der neue Dienst gestoppt wurde).

---

## 🇬🇧 Quick start (copy/paste)

On the server, inside the project folder (e.g. `/opt/dks/redbot-dks-dashboard`):

```bash
# 1) create and fill .env (once)
cp .env.example .env && nano .env

# 2) build + install + start the service
sudo bash deploy/install-service.sh
```

The script is **idempotent**: creates the `dks` system user if needed, builds the app
(`npm ci && npm run build`), writes the systemd unit, enables and starts it.

Configurable via environment variables:
```bash
APP_DIR=/opt/dks/redbot-dks-dashboard SERVICE_USER=dks SERVICE_NAME=dks-dashboard \
  sudo -E bash deploy/install-service.sh
```

**Afterwards:**
```bash
journalctl -u dks-dashboard -f          # live logs
sudo systemctl restart dks-dashboard    # restart
sudo bash deploy/update.sh              # update: pull + build + restart
```

### Notes
- The service loads `.env` via `EnvironmentFile=` (so `node build` needs **no** dotenv here).
- Behind an HTTPS reverse proxy, add to `.env`:
  `ORIGIN=https://your-domain`, `PROTOCOL_HEADER=x-forwarded-proto`,
  `HOST_HEADER=x-forwarded-host`.
- systemd `.env` format: one `KEY=value` per line, **no** `export`, no quotes.

### Manual (no script)
Copy `dks-dashboard.service` to `/etc/systemd/system/`, adjust paths/user, then:
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now dks-dashboard
```

### Migration dks -> pdc (one-time)
To move an existing `dks` install to the new `pdc` identity (new system user, new
service name, `origin` re-pointed to the new repo), use `deploy/migrate.sh`. It
keeps the app directory in place and keeps the old service/user disabled as a
fallback. **Run once as root:**
```bash
sudo bash deploy/migrate.sh
```
Configurable via environment variables (defaults):
```bash
NEW_SERVICE_NAME=pdc-redbot-webapp NEW_SERVICE_USER=pdc \
OLD_SERVICE_NAME=dks-dashboard OLD_SERVICE_USER=dks \
  sudo -E bash deploy/migrate.sh
```
Note: there is a short downtime during the rebuild (the old service is stopped
first). Rollback: `sudo systemctl enable --now dks-dashboard` (after stopping the
new service).
