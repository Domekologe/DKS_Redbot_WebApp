# DKS Redbot WebApp

> 🇩🇪 Deutsch zuerst — 🇬🇧 **English version below.**

Modernes, modulares Web-Dashboard (Frontend + BFF) für den DKS Red-DiscordBot.
Gegenstück zum Companion-Cog `webdashboard` (Repo `DKS_Redcogs`).

- **Stack:** SvelteKit + TypeScript + TailwindCSS (shadcn-svelte-Tokens), adapter-node
- **Auth:** Discord OAuth2 (Login im SvelteKit-Server / BFF)
- **Transport zum Bot:** JSON-RPC 2.0 über das Gateway des Cogs (HTTP + WebSocket)
- **Sprachen:** Deutsch & Englisch (Umschalter oben rechts)

Architektur-Details: `DKS_Redcogs/webdashboard/ARCHITECTURE.md`.

## Funktionen

- Öffentliche Landing/Übersicht + **Befehlsliste** (ohne Login).
- Nach Login: **Server-Übersicht**, Bot-Einstellungen pro Gilde, eingebettete
  **Cog-Widgets & -Panels** (aufklappbar).
- **Cog-Verwaltung** (`/cogs`): Cogs laden/entladen, **Downloader** (Repos & Cogs),
  **Slash** (gruppiert nach Cog, einzeln/Cog-weit an/aus, Sync).
- **Einstellungen** (`/settings`): globale Bot-Settings, Branding, Lock/Refresh,
  globale Modul-Panels.
- **Custom Pages** (`/pages`) mit WYSIWYG-Editor.

## Entwicklung

```bash
npm install
cp .env.example .env      # Werte eintragen (siehe unten)
npm run dev               # http://localhost:5173
```

### `.env`
| Variable | Beschreibung |
|---|---|
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Aus dem Discord Developer Portal (OAuth2) |
| `DISCORD_REDIRECT_URI` | Muss exakt als Redirect im Portal hinterlegt sein |
| `GATEWAY_URL` | Adresse des Cog-Gateways (Default `http://127.0.0.1:6970`) |
| `GATEWAY_TOKEN` | Im Bot mit `[p]dksdashboard token` abrufen |
| `SESSION_SECRET` | Langes Zufalls-Secret, z. B. `openssl rand -hex 32` |

## Production (empfohlen: `node build`, nicht `npm run dev`)

**Schnellster Weg – fertiger Linux-Service per Copy/Paste:**
```bash
cp .env.example .env && nano .env     # einmalig konfigurieren
sudo bash deploy/install-service.sh   # baut + richtet systemd-Service ein + startet
```
Details/Update-Skript: `deploy/README.md`. Manuell geht es so:

```bash
npm ci
npm run build
node -r dotenv/config build      # startet adapter-node (Default Port 3000)
```

**Wichtige Stolpersteine (aus der Praxis):**

1. **`node build` liest die `.env` NICHT.** adapter-node nutzt nur echte
   Umgebungsvariablen. Lade sie z. B. mit `node -r dotenv/config build`
   (`npm i dotenv`), `set -a; . ./.env; set +a` oder systemd `EnvironmentFile=`.
2. **Hinter HTTPS-Reverse-Proxy** zusätzlich setzen, sonst u. a. 403 beim Logout:
   ```dotenv
   ORIGIN=https://deine-domain
   PROTOCOL_HEADER=x-forwarded-proto
   HOST_HEADER=x-forwarded-host
   ```
3. **Tailwind-Config muss existieren.** Fehlt `tailwind.config.(cjs|js)`, baut Tailwind nur
   das Base-Layer → Seite ist (fast) ungestylt. Config nie löschen, ins Git committen.
   Bei `"type":"module"` ist `tailwind.config.cjs` (CommonJS) am robustesten.
4. **Proxy muss `/_app/` durchreichen.** Eine einzige Catch-all-`location /` zum Node-Port
   genügt; kein `root`/`try_files`, das `/_app/...` abfängt.
5. **CDN-Cache (z. B. Cloudflare):** Assets sind `immutable` gecacht. Nach Rebuilds beim
   Iterieren ggf. Cache purgen oder „Development Mode" nutzen.

### systemd
```ini
# /etc/systemd/system/dks-dashboard.service
[Unit]
Description=DKS Redbot WebApp
After=network.target
[Service]
WorkingDirectory=/opt/dks/redbot-dks-dashboard
EnvironmentFile=/opt/dks/redbot-dks-dashboard/.env
ExecStart=/usr/bin/node build
Restart=on-failure
User=dks
[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now dks-dashboard
journalctl -u dks-dashboard -f
```

### Docker
```bash
cp .env.example .env
docker compose up -d --build      # http://localhost:3000
```
Läuft der Bot auf dem Host: `GATEWAY_URL=http://host.docker.internal:6970` (Compose mappt
`host.docker.internal` per `extra_hosts` auch unter Linux).

### nginx (Reverse-Proxy)
```nginx
server {
    server_name deine-domain;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

## Eigenen Cog anbinden

Das macht man auf der **Bot-Seite** (Python), nicht hier. Anleitung + Vorlage:
`DKS_Redcogs/webdashboard/INTEGRATION.md` und das Cog `dashboardtemplate`.

## Struktur
```
src/
  hooks.server.ts            Session aus Cookie + Epoch-Check
  lib/server/                NUR serverseitig (Secrets!): env, session, auth, rpc
  lib/components/            Widget, PanelForm, ui/
  lib/i18n/                  de + en
  routes/
    +page.svelte             Landing/Übersicht (öffentlich)
    commands/                öffentliche Befehlsliste
    guilds/ [id]/ settings/  Server-Übersicht + Bot-Einstellungen
    cogs/                    Cog-Verwaltung (Cogs/Slash/Downloader)
    settings/                globale Settings + Branding + globale Panels
    pages/  p/[slug]/        Custom Pages (Editor + öffentliche Ansicht)
    auth/… logout            OAuth2-Flow
    api/…                    BFF-Endpunkte (rufen RPC auf)
```

---

# 🇬🇧 DKS Redbot WebApp — English

A modern, modular web dashboard (frontend + BFF) for the DKS Red-DiscordBot.
Counterpart to the companion cog `webdashboard` (repo `DKS_Redcogs`).

- **Stack:** SvelteKit + TypeScript + TailwindCSS (shadcn-svelte tokens), adapter-node
- **Auth:** Discord OAuth2 (login in the SvelteKit server / BFF)
- **Transport to the bot:** JSON-RPC 2.0 via the cog's gateway (HTTP + WebSocket)
- **Languages:** German & English (switch in the top-right)

Architecture details: `DKS_Redcogs/webdashboard/ARCHITECTURE.md`.

## Features

- Public landing/overview + **command list** (no login).
- After login: **server overview**, per-guild bot settings, embedded **cog widgets &
  panels** (collapsible).
- **Cog management** (`/cogs`): load/unload cogs, **Downloader** (repos & cogs),
  **Slash** (grouped by cog, per-command/per-cog toggle, sync).
- **Settings** (`/settings`): global bot settings, branding, lock/refresh, global module
  panels.
- **Custom Pages** (`/pages`) with a WYSIWYG editor.

## Development

```bash
npm install
cp .env.example .env      # fill in values (see below)
npm run dev               # http://localhost:5173
```

### `.env`
| Variable | Description |
|---|---|
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | From the Discord Developer Portal (OAuth2) |
| `DISCORD_REDIRECT_URI` | Must be registered exactly as a redirect in the portal |
| `GATEWAY_URL` | Address of the cog gateway (default `http://127.0.0.1:6970`) |
| `GATEWAY_TOKEN` | Get it on the bot with `[p]dksdashboard token` |
| `SESSION_SECRET` | Long random secret, e.g. `openssl rand -hex 32` |

## Production (recommended: `node build`, not `npm run dev`)

**Fastest path – ready-made Linux service via copy/paste:**
```bash
cp .env.example .env && nano .env     # configure once
sudo bash deploy/install-service.sh   # builds + installs the systemd service + starts it
```
Details/update script: `deploy/README.md`. Manual route:

```bash
npm ci
npm run build
node -r dotenv/config build      # starts adapter-node (default port 3000)
```

**Important gotchas (learned the hard way):**

1. **`node build` does NOT read `.env`.** adapter-node only uses real environment
   variables. Load them via `node -r dotenv/config build` (`npm i dotenv`),
   `set -a; . ./.env; set +a`, or systemd `EnvironmentFile=`.
2. **Behind an HTTPS reverse proxy** also set these (otherwise e.g. 403 on logout):
   ```dotenv
   ORIGIN=https://your-domain
   PROTOCOL_HEADER=x-forwarded-proto
   HOST_HEADER=x-forwarded-host
   ```
3. **A Tailwind config must exist.** Without `tailwind.config.(cjs|js)`, Tailwind only
   emits the base layer → the page is (almost) unstyled. Never delete it; commit it to git.
   With `"type":"module"`, `tailwind.config.cjs` (CommonJS) is the most robust.
4. **The proxy must pass `/_app/` through.** A single catch-all `location /` to the Node
   port is enough; no `root`/`try_files` intercepting `/_app/...`.
5. **CDN cache (e.g. Cloudflare):** assets are cached `immutable`. While iterating, purge
   the cache after rebuilds or use "Development Mode".

### systemd
See the German section above for a ready-to-use unit file; the key is
`EnvironmentFile=…/.env` + `ExecStart=/usr/bin/node build`.

### Docker
```bash
cp .env.example .env
docker compose up -d --build      # http://localhost:3000
```
If the bot runs on the host: `GATEWAY_URL=http://host.docker.internal:6970` (compose maps
`host.docker.internal` via `extra_hosts`, also on Linux).

## Integrating your own cog

That's done on the **bot side** (Python), not here. Guide + template:
`DKS_Redcogs/webdashboard/INTEGRATION.md` and the `dashboardtemplate` cog.

## Structure
See the German section above; routes mirror the features (landing, commands, guilds,
cogs, settings, pages) with `api/…` BFF endpoints calling RPC, and `lib/server/` holding
all secrets server-side.
