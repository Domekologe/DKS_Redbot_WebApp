<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';

  const importCode = `# Variante B (entkoppelt): dropin.py als dks_dashboard.py in den Cog kopieren
from .dks_dashboard import (
    dashboard_widget, dashboard_panel,
    WidgetData, PanelSchema, Field, SubmitResult,
    register_dashboard, unregister_dashboard,
)

# Variante A (direkt), wenn webdashboard ohnehin installiert ist:
from webdashboard.integration import (
    dashboard_widget, dashboard_panel,
    WidgetData, PanelSchema, Field, SubmitResult,
    register_dashboard, unregister_dashboard,
)`;

  const widgetCode = `@dashboard_widget("member_count", "Mitglieder", size="sm",
                  refresh=60, permission="guild_member")
async def member_count(self, ctx):
    return WidgetData.kpi(value=ctx.guild.member_count,
                          label="Mitglieder", icon="users")`;

  const panelCode = `@dashboard_panel("welcome", "Willkommensnachricht",
                 mount="guild_settings", permission="guild_admin")
async def welcome_panel(self, ctx):
    cfg = await self.config.guild(ctx.guild).welcome()
    return PanelSchema(fields=[
        Field.switch("enabled", "Aktiviert", value=cfg["enabled"]),
        Field.textarea("message", "Nachricht", value=cfg["message"], max_length=2000),
        Field.channel("channel", "Kanal", value=cfg["channel"]),
    ])

@welcome_panel.on_submit
async def save_welcome(self, ctx, data):
    await self.config.guild(ctx.guild).welcome.set(data)
    return SubmitResult.ok("Gespeichert.")`;

  const registerCode = `async def cog_load(self):
    # ... deine bestehende Logik ...
    register_dashboard(self)     # integriert NUR, wenn WebDashboard geladen ist

def cog_unload(self):
    unregister_dashboard(self)   # sicher, auch wenn nichts registriert war`;

  const levels = [
    'authenticated', 'guild_member', 'guild_mod', 'guild_admin', 'guild_owner', 'bot_owner'
  ];
</script>

<div class="prose-none max-w-3xl space-y-6">
  <div>
    <h1 class="text-2xl font-semibold">Eigene Cogs integrieren</h1>
    <p class="mt-2 text-sm text-muted-foreground">
      So trägt ein beliebiger Red-Cog Widgets und Panels zu diesem Dashboard bei –
      optional (nur wenn das Dashboard geladen ist) und parallel zum AAA3A-Dashboard.
    </p>
  </div>

  <Card class="p-5">
    <h2 class="mb-2 text-lg font-semibold">Grundprinzipien</h2>
    <ul class="list-disc space-y-1 pl-5 text-sm">
      <li><b>Keine harte Abhängigkeit</b> – ohne <code>webdashboard</code> werden die Decorators zu No-ops.</li>
      <li><b>Opt-in zur Laufzeit</b> – Integration nur, wenn der <code>WebDashboard</code>-Cog geladen ist.</li>
      <li><b>AAA3A-kompatibel</b> – beide Dashboards dürfen gleichzeitig laufen.</li>
      <li><b>Nur deklarative Schemas</b> – kein rohes HTML, daher keine XSS-Fläche.</li>
    </ul>
  </Card>

  <Card class="p-5">
    <h2 class="mb-2 text-lg font-semibold">1 · Helfer einbinden</h2>
    <pre class="overflow-x-auto rounded-md bg-muted p-3 text-xs"><code>{importCode}</code></pre>
  </Card>

  <Card class="p-5">
    <h2 class="mb-2 text-lg font-semibold">2 · Widget (Kachel auf dem Board)</h2>
    <pre class="overflow-x-auto rounded-md bg-muted p-3 text-xs"><code>{widgetCode}</code></pre>
    <p class="mt-3 text-sm text-muted-foreground">Datentypen: <code>WidgetData.kpi</code>, <code>.list</code>, <code>.chart</code>, <code>.status</code>, <code>.markdown</code>.</p>
  </Card>

  <Card class="p-5">
    <h2 class="mb-2 text-lg font-semibold">3 · Panel (kontextuelles Formular)</h2>
    <pre class="overflow-x-auto rounded-md bg-muted p-3 text-xs"><code>{panelCode}</code></pre>
    <p class="mt-3 text-sm text-muted-foreground">Feldtypen: text, textarea, number, switch, select, multiselect, channel, role, user, color.</p>
  </Card>

  <Card class="p-5">
    <h2 class="mb-2 text-lg font-semibold">4 · Bedingt registrieren („das Extra")</h2>
    <pre class="overflow-x-auto rounded-md bg-muted p-3 text-xs"><code>{registerCode}</code></pre>
  </Card>

  <Card class="p-5">
    <h2 class="mb-2 text-lg font-semibold">Permission-Stufen</h2>
    <div class="flex flex-wrap gap-2">
      {#each levels as l}
        <span class="rounded-full border border-border px-3 py-1 text-xs">{l}</span>
      {/each}
    </div>
    <p class="mt-3 text-sm text-muted-foreground">
      Die Stufe wird serverseitig aus Reds Rechtesystem abgeleitet und bei jedem Aufruf erzwungen.
    </p>
  </Card>

  <p class="text-sm text-muted-foreground">
    Vollständige Anleitung: <code>webdashboard/INTEGRATION.md</code>. Lauffähiges Beispiel:
    Cog <code>dashboardexample</code>.
  </p>
</div>
