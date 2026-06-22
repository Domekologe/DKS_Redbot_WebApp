<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import BarChart from '$lib/components/charts/BarChart.svelte';
  import DonutChart from '$lib/components/charts/DonutChart.svelte';
  import SeriesToggle from '$lib/components/charts/SeriesToggle.svelte';
  import { onDestroy } from 'svelte';
  import { t } from '$lib/i18n';
  import type { StatsGuild } from './+page.server';

  export let data: { guilds: StatsGuild[] };

  // ── Palette ──────────────────────────────────────────────────────────
  const COLORS = {
    green: '#22c55e',
    blue: '#3b82f6',
    red: '#ef4444',
    amber: '#f59e0b',
    violet: '#8b5cf6'
  };
  const DONUT = ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];

  type Section =
    | 'overview'
    | 'messages'
    | 'voice'
    | 'status'
    | 'invites'
    | 'activity'
    | 'commands'
    | 'member_drilldown'
    | 'channel_drilldown';

  const MENU: Array<{ key: Section; tkey: string }> = [
    { key: 'overview', tkey: 'stats.menu_overview' },
    { key: 'messages', tkey: 'stats.menu_messages' },
    { key: 'voice', tkey: 'stats.menu_voice' },
    { key: 'status', tkey: 'stats.menu_status' },
    { key: 'invites', tkey: 'stats.menu_invites' },
    { key: 'activity', tkey: 'stats.menu_activity' },
    { key: 'commands', tkey: 'stats.menu_commands' },
    { key: 'member_drilldown', tkey: 'stats.menu_member_drilldown' },
    { key: 'channel_drilldown', tkey: 'stats.menu_channel_drilldown' }
  ];

  const DAY_OPTIONS = [7, 14, 30, 60, 90];

  // ── State ────────────────────────────────────────────────────────────
  let selectedGuild: string = data.guilds[0]?.id ?? '';
  let section: Section = 'overview';
  let days = 30;
  let memberId = '';
  let channelId = '';

  let loading = false;
  let error = '';
  let result: any = null;

  // Toggle-Zustand pro Sektion (verstecken/zeigen einzelner Reihen).
  let hidden: Record<string, boolean[]> = {};

  // Damit Reaktivität nicht in eine Endlosschleife läuft, hängen wir den
  // Fetch nur an die Eingangs-Parameter, nicht an `result`.
  let lastKey = '';
  let reqSeq = 0;

  async function fetchStats(key: string) {
    const seq = ++reqSeq; // nur die jeweils NEUESTE Anfrage darf das Ergebnis setzen
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/stats', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          section,
          guildId: selectedGuild,
          days,
          member_id: memberId,
          channel_id: channelId
        })
      });
      const j = await res.json();
      if (seq !== reqSeq) return; // veraltete Antwort (User hat inzwischen umgeschaltet)
      if (j.error) {
        error = j.error;
        result = null;
      } else {
        result = j;
        // Drilldown: ausgewählte Option vom Server übernehmen.
        if (section === 'member_drilldown' && j.member_id != null) memberId = j.member_id;
        if (section === 'channel_drilldown' && j.channel_id != null) channelId = j.channel_id;
      }
    } catch (e) {
      if (seq !== reqSeq) return;
      error = e instanceof Error ? e.message : $t('stats.load_error');
      result = null;
    } finally {
      if (seq === reqSeq) {
        loading = false;
        lastKey = key;
      }
    }
  }

  // Reaktiv: nur Eingangs-Parameter triggern.
  $: requestKey = `${selectedGuild}|${section}|${days}|${memberId}|${channelId}`;
  $: if (selectedGuild && requestKey !== lastKey) {
    fetchStats(requestKey);
  }

  // Auto-Aktualisierung: alle 15s neu laden, solange aktiv.
  let auto = false;
  let autoTimer: ReturnType<typeof setInterval> | null = null;
  $: {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    if (auto && selectedGuild) {
      autoTimer = setInterval(() => fetchStats(requestKey), 15000);
    }
  }
  onDestroy(() => {
    if (autoTimer) clearInterval(autoTimer);
  });

  // Sektionswechsel → Toggle-Status zurücksetzen.
  function selectSection(s: Section) {
    section = s;
  }

  function toggleSeries(sec: string, count: number, i: number) {
    const arr = hidden[sec] ?? new Array(count).fill(false);
    arr[i] = !arr[i];
    hidden = { ...hidden, [sec]: [...arr] };
  }
  function isHidden(sec: string, i: number): boolean {
    return hidden[sec]?.[i] ?? false;
  }

  // ── Formatierung ─────────────────────────────────────────────────────
  const nf = new Intl.NumberFormat('de-DE');
  function fmt(n: number | null | undefined): string {
    if (n == null) return '–';
    return nf.format(n);
  }
  function fmtHours(n: number | null | undefined): string {
    if (n == null) return '–';
    return nf.format(Math.round(n * 10) / 10);
  }
  function shortDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function readableDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function guildIconUrl(g: StatsGuild): string | null {
    if (!g.icon) return null;
    return `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`;
  }

  // ── Abgeleitete Datasets (mit Toggle) ────────────────────────────────
  $: overviewSeries =
    result && section === 'overview'
      ? [
          { label: $t('stats.series_members'), color: COLORS.green, data: result.members ?? [], hidden: isHidden('overview', 0) },
          { label: $t('stats.series_joins'), color: COLORS.blue, data: result.joins ?? [], hidden: isHidden('overview', 1) },
          { label: $t('stats.series_leaves'), color: COLORS.red, data: result.leaves ?? [], hidden: isHidden('overview', 2) }
        ]
      : [];

  $: statusSeries =
    result && section === 'status'
      ? [
          { label: $t('stats.series_online'), color: COLORS.green, data: (result.samples ?? []).map((s: any) => s.on), fill: true, hidden: isHidden('status', 0) },
          { label: $t('stats.series_idle'), color: COLORS.amber, data: (result.samples ?? []).map((s: any) => s.idle), fill: true, hidden: isHidden('status', 1) },
          { label: $t('stats.series_dnd'), color: COLORS.red, data: (result.samples ?? []).map((s: any) => s.dnd), fill: true, hidden: isHidden('status', 2) }
        ]
      : [];
  $: statusLabels = result && section === 'status' ? (result.samples ?? []).map((s: any) => shortDate(s.t)) : [];

  $: inviteSeries =
    result && section === 'invites'
      ? Object.keys(result.series ?? {}).map((code, idx) => ({
          label: code,
          color: DONUT[idx % DONUT.length],
          data: result.series[code] as number[],
          hidden: isHidden('invites', idx)
        }))
      : [];
</script>

<div class="space-y-5">
  <!-- Top bar ───────────────────────────────────────────────────────── -->
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-2xl font-semibold">{$t('stats.title')}</h1>
    <div class="flex flex-wrap items-center gap-2">
      <select
        bind:value={selectedGuild}
        class="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        aria-label={$t('stats.server')}
      >
        {#each data.guilds as g (g.id)}
          <option value={g.id}>{g.name}</option>
        {/each}
      </select>
      <label class="flex items-center gap-1.5 text-sm text-muted-foreground">
        {$t('stats.period')}
        <select bind:value={days} class="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground">
          {#each DAY_OPTIONS as d (d)}
            <option value={d}>{$t('stats.days', { n: d })}</option>
          {/each}
        </select>
      </label>
      <label class="flex items-center gap-1.5 text-sm text-muted-foreground">
        <input type="checkbox" bind:checked={auto} class="accent-primary" />
        {$t('stats.auto_refresh')}
      </label>
    </div>
  </div>

  {#if data.guilds.length === 0}
    <Card class="p-4"><p class="text-sm text-muted-foreground">{$t('stats.no_servers')}</p></Card>
  {:else}
    <div class="flex flex-col gap-5 lg:flex-row">
      <!-- Side menu ──────────────────────────────────────────────── -->
      <div class="shrink-0 lg:w-52">
        <div class="flex flex-wrap gap-1 lg:flex-col">
          {#each MENU as m (m.key)}
            <button
              type="button"
              on:click={() => selectSection(m.key)}
              class="rounded-md px-3 py-1.5 text-left text-sm transition
                {section === m.key ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:bg-secondary/50'}"
            >
              {$t(m.tkey)}
            </button>
          {/each}
        </div>
      </div>

      <!-- Main content ───────────────────────────────────────────── -->
      <div class="min-w-0 flex-1 space-y-5">
        {#if loading}
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {#each Array(4) as _, i (i)}
                <Card class="h-20 animate-pulse bg-secondary/40 p-4"></Card>
              {/each}
            </div>
            <Card class="h-[320px] animate-pulse bg-secondary/40 p-4"></Card>
          </div>
        {:else if error}
          <Card class="border-destructive/50 p-4"><p class="text-sm text-destructive">{error}</p></Card>
        {:else if result}

          <!-- OVERVIEW ───────────────────────────────────────────── -->
          {#if section === 'overview'}
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
              <Card class="p-4"><p class="text-xs text-muted-foreground">{$t('stats.kpi_members')}</p><p class="mt-1 text-2xl font-semibold">{fmt(result.kpi?.members)}</p></Card>
              <Card class="p-4"><p class="text-xs text-muted-foreground">{$t('stats.kpi_joins_7d')}</p><p class="mt-1 text-2xl font-semibold text-blue-400">{fmt(result.kpi?.joins_7d)}</p></Card>
              <Card class="p-4"><p class="text-xs text-muted-foreground">{$t('stats.kpi_leaves_7d')}</p><p class="mt-1 text-2xl font-semibold text-red-400">{fmt(result.kpi?.leaves_7d)}</p></Card>
              <Card class="p-4"><p class="text-xs text-muted-foreground">{$t('stats.kpi_messages_7d')}</p><p class="mt-1 text-2xl font-semibold">{fmt(result.kpi?.messages_7d)}</p></Card>
              <Card class="col-span-2 p-4 sm:col-span-1"><p class="text-xs text-muted-foreground">{$t('stats.kpi_voice_hours_7d')}</p><p class="mt-1 text-2xl font-semibold">{fmtHours(result.kpi?.voice_hours_7d)}</p></Card>
            </div>
            <Card class="p-4">
              <div class="mb-3">
                <SeriesToggle
                  series={overviewSeries.map((s) => ({ label: s.label, color: s.color, hidden: s.hidden }))}
                  on:toggle={(e) => toggleSeries('overview', 3, e.detail)}
                />
              </div>
              <LineChart labels={result.labels ?? []} datasets={overviewSeries} />
            </Card>

          <!-- MESSAGES / VOICE ───────────────────────────────────── -->
          {:else if section === 'messages' || section === 'voice'}
            {@const isVoice = section === 'voice'}
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card class="p-4"><p class="text-xs text-muted-foreground">{isVoice ? $t('stats.total_hours') : $t('stats.total')}</p><p class="mt-1 text-2xl font-semibold">{isVoice ? fmtHours(result.total) : fmt(result.total)}</p></Card>
              <Card class="p-4"><p class="text-xs text-muted-foreground">{$t('stats.unique_members')}</p><p class="mt-1 text-2xl font-semibold">{fmt(result.unique_members)}</p></Card>
              <Card class="p-4"><p class="text-xs text-muted-foreground">{$t('stats.unique_channels')}</p><p class="mt-1 text-2xl font-semibold">{fmt(result.unique_channels)}</p></Card>
            </div>
            <Card class="p-4">
              <BarChart
                labels={result.labels ?? []}
                datasets={[{ label: isVoice ? $t('stats.label_hours') : $t('stats.label_messages'), color: isVoice ? COLORS.violet : COLORS.blue, data: result.values ?? [] }]}
              />
            </Card>
            <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card class="p-4">
                <p class="mb-3 text-sm font-semibold">{$t('stats.top_members')}</p>
                {#if (result.top_members ?? []).length}
                  <DonutChart
                    labels={result.top_members.map((m) => m.name)}
                    data={result.top_members.map((m) => m.value)}
                    colors={DONUT}
                  />
                  <table class="mt-3 w-full text-sm">
                    <tbody>
                      {#each result.top_members as m, i (m.id)}
                        <tr class="border-b border-border/40 last:border-0">
                          <td class="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                          <td class="py-1.5 pr-2 truncate">{m.name}</td>
                          <td class="py-1.5 text-right tabular-nums">{isVoice ? fmtHours(m.value) : fmt(m.value)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {:else}
                  <p class="text-sm text-muted-foreground">{$t('common.no_data')}</p>
                {/if}
              </Card>
              <Card class="p-4">
                <p class="mb-3 text-sm font-semibold">{$t('stats.top_channels')}</p>
                {#if (result.top_channels ?? []).length}
                  <DonutChart
                    labels={result.top_channels.map((c) => c.name)}
                    data={result.top_channels.map((c) => c.value)}
                    colors={DONUT}
                  />
                  <table class="mt-3 w-full text-sm">
                    <tbody>
                      {#each result.top_channels as c, i (c.id)}
                        <tr class="border-b border-border/40 last:border-0">
                          <td class="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                          <td class="py-1.5 pr-2 truncate">{c.name}</td>
                          <td class="py-1.5 text-right tabular-nums">{isVoice ? fmtHours(c.value) : fmt(c.value)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {:else}
                  <p class="text-sm text-muted-foreground">{$t('common.no_data')}</p>
                {/if}
              </Card>
            </div>

          <!-- STATUS ─────────────────────────────────────────────── -->
          {:else if section === 'status'}
            <Card class="p-4">
              <div class="mb-3">
                <SeriesToggle
                  series={statusSeries.map((s) => ({ label: s.label, color: s.color, hidden: s.hidden }))}
                  on:toggle={(e) => toggleSeries('status', 3, e.detail)}
                />
              </div>
              {#if statusLabels.length}
                <LineChart labels={statusLabels} datasets={statusSeries} area stacked />
              {:else}
                <p class="text-sm text-muted-foreground">{$t('stats.no_status_data')}</p>
              {/if}
            </Card>

          <!-- INVITES ────────────────────────────────────────────── -->
          {:else if section === 'invites'}
            <Card class="p-4">
              {#if inviteSeries.length}
                <div class="mb-3">
                  <SeriesToggle
                    series={inviteSeries.map((s) => ({ label: s.label, color: s.color, hidden: s.hidden }))}
                    on:toggle={(e) => toggleSeries('invites', inviteSeries.length, e.detail)}
                  />
                </div>
                <LineChart labels={result.labels ?? []} datasets={inviteSeries} />
              {:else}
                <p class="text-sm text-muted-foreground">{$t('stats.no_invite_data')}</p>
              {/if}
            </Card>
            <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card class="p-4">
                <p class="mb-3 text-sm font-semibold">{$t('stats.top_invites')}</p>
                {#if (result.top_invites ?? []).length}
                  <DonutChart
                    labels={result.top_invites.map((t) => t.code)}
                    data={result.top_invites.map((t) => t.count)}
                    colors={DONUT}
                  />
                  <table class="mt-3 w-full text-sm">
                    <tbody>
                      {#each result.top_invites as t, i (t.code)}
                        <tr class="border-b border-border/40 last:border-0">
                          <td class="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                          <td class="py-1.5 pr-2"><code>{t.code}</code></td>
                          <td class="py-1.5 text-right tabular-nums">{fmt(t.count)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {:else}
                  <p class="text-sm text-muted-foreground">{$t('common.no_data')}</p>
                {/if}
              </Card>
              <Card class="p-4">
                <p class="mb-3 text-sm font-semibold">{$t('stats.top_members')}</p>
                {#if (result.top_members ?? []).length}
                  <table class="w-full text-sm">
                    <tbody>
                      {#each result.top_members as m, i (m.id)}
                        <tr class="border-b border-border/40 last:border-0">
                          <td class="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                          <td class="py-1.5 pr-2 truncate">{m.name}</td>
                          <td class="py-1.5 text-right tabular-nums">{fmt(m.value)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {:else}
                  <p class="text-sm text-muted-foreground">{$t('common.no_data')}</p>
                {/if}
              </Card>
            </div>
            <Card class="p-4">
              <p class="mb-3 text-sm font-semibold">{$t('stats.recent_invites')}</p>
              {#if (result.recent_logs ?? []).length}
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-xs text-muted-foreground">
                      <th class="py-1.5 pr-2 font-medium">{$t('stats.col_date')}</th>
                      <th class="py-1.5 pr-2 font-medium">{$t('stats.col_member')}</th>
                      <th class="py-1.5 font-medium">{$t('stats.col_code')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each result.recent_logs as log, i (log.user_id + '-' + i)}
                      <tr class="border-b border-border/40 last:border-0">
                        <td class="py-1.5 pr-2 text-muted-foreground">{readableDate(log.date)}</td>
                        <td class="py-1.5 pr-2 truncate">{log.username}</td>
                        <td class="py-1.5"><code>{log.code}</code></td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {:else}
                <p class="text-sm text-muted-foreground">{$t('common.no_entries')}</p>
              {/if}
            </Card>

          <!-- ACTIVITY ───────────────────────────────────────────── -->
          {:else if section === 'activity'}
            <Card class="p-4">
              <p class="mb-3 text-sm font-semibold">{$t('stats.top_games')}</p>
              {#if (result.top_games ?? []).length}
                <BarChart
                  labels={result.top_games.map((g) => g.name)}
                  datasets={[{ label: $t('stats.label_hours'), color: COLORS.violet, data: result.top_games.map((g) => Math.round((g.minutes / 60) * 10) / 10) }]}
                  horizontal
                />
                <table class="mt-3 w-full text-sm">
                  <thead>
                    <tr class="text-left text-xs text-muted-foreground">
                      <th class="py-1.5 pr-2 font-medium">#</th>
                      <th class="py-1.5 pr-2 font-medium">{$t('stats.col_game')}</th>
                      <th class="py-1.5 text-right font-medium">{$t('stats.col_minutes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each result.top_games as g, i (g.name)}
                      <tr class="border-b border-border/40 last:border-0">
                        <td class="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                        <td class="py-1.5 pr-2 truncate">{g.name}</td>
                        <td class="py-1.5 text-right tabular-nums">{fmt(g.minutes)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {:else}
                <p class="text-sm text-muted-foreground">{$t('stats.no_activity_data')}</p>
              {/if}
            </Card>

          <!-- COMMANDS ───────────────────────────────────────────── -->
          {:else if section === 'commands'}
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Card class="p-4"><p class="text-xs uppercase tracking-wide text-muted-foreground">{$t('stats.total')}</p><p class="mt-1.5 text-2xl font-semibold">{result.total ?? 0}</p></Card>
              <Card class="p-4"><p class="text-xs uppercase tracking-wide text-muted-foreground">{$t('stats.unique_commands')}</p><p class="mt-1.5 text-2xl font-semibold">{result.unique_commands ?? 0}</p></Card>
              <Card class="p-4"><p class="text-xs uppercase tracking-wide text-muted-foreground">{$t('stats.errors')}</p><p class="mt-1.5 text-2xl font-semibold">{result.total_errors ?? 0}</p></Card>
            </div>
            <Card class="p-4">
              <p class="mb-3 text-sm font-semibold">{$t('stats.menu_commands')}</p>
              {#if (result.values ?? []).some((v) => v > 0)}
                <BarChart labels={result.labels} datasets={[{ label: $t('stats.menu_commands'), color: COLORS.blue, data: result.values }]} />
              {/if}
              {#if (result.top_commands ?? []).length}
                <table class="mt-3 w-full text-sm">
                  <thead>
                    <tr class="text-left text-xs text-muted-foreground">
                      <th class="py-1.5 pr-2 font-medium">#</th>
                      <th class="py-1.5 pr-2 font-medium">{$t('stats.col_command')}</th>
                      <th class="py-1.5 text-right font-medium">{$t('stats.total')}</th>
                      <th class="py-1.5 text-right font-medium">{$t('stats.errors')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each result.top_commands as c, i (c.name)}
                      <tr class="border-b border-border/40 last:border-0">
                        <td class="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                        <td class="py-1.5 pr-2"><code class="text-primary">{c.name}</code></td>
                        <td class="py-1.5 text-right tabular-nums">{c.count}</td>
                        <td class="py-1.5 text-right tabular-nums {c.errors ? 'text-destructive' : 'text-muted-foreground'}">{c.errors}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {:else}
                <p class="text-sm text-muted-foreground">{$t('stats.no_command_data')}</p>
              {/if}
            </Card>

          <!-- MEMBER DRILLDOWN ───────────────────────────────────── -->
          {:else if section === 'member_drilldown'}
            <Card class="p-4">
              <div class="mb-4 flex flex-wrap items-center gap-2">
                <label class="text-sm text-muted-foreground" for="member-sel">{$t('stats.member')}</label>
                <select
                  id="member-sel"
                  bind:value={memberId}
                  class="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  {#each result.options ?? [] as o (o.id)}
                    <option value={o.id}>{o.name}</option>
                  {/each}
                </select>
                {#if result.name}<span class="text-sm font-medium">{result.name}</span>{/if}
              </div>
              <LineChart
                labels={result.labels ?? []}
                datasets={[
                  { label: $t('stats.label_messages'), color: COLORS.blue, data: result.messages ?? [] },
                  { label: $t('stats.voice_hours'), color: COLORS.violet, data: result.voice_hours ?? [] }
                ]}
              />
            </Card>

          <!-- CHANNEL DRILLDOWN ──────────────────────────────────── -->
          {:else if section === 'channel_drilldown'}
            <Card class="p-4">
              <div class="mb-4 flex flex-wrap items-center gap-2">
                <label class="text-sm text-muted-foreground" for="channel-sel">{$t('stats.channel')}</label>
                <select
                  id="channel-sel"
                  bind:value={channelId}
                  class="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  {#each result.options ?? [] as o (o.id)}
                    <option value={o.id}>{o.name}</option>
                  {/each}
                </select>
                {#if result.name}<span class="text-sm font-medium">{result.name}</span>{/if}
              </div>
              <LineChart
                labels={result.labels ?? []}
                datasets={[
                  { label: $t('stats.label_messages'), color: COLORS.blue, data: result.messages ?? [] },
                  { label: $t('stats.voice_hours'), color: COLORS.violet, data: result.voice_hours ?? [] }
                ]}
              />
            </Card>
          {/if}

        {:else}
          <Card class="p-4"><p class="text-sm text-muted-foreground">{$t('common.no_data')}</p></Card>
        {/if}
      </div>
    </div>
  {/if}
</div>
