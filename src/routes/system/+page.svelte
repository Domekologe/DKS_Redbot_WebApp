<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import { invalidateAll } from '$app/navigation';
  import { t } from '$lib/i18n';
  import type { SystemInfo } from './+page.server';

  export let data: { isOwner: boolean; info: SystemInfo | null; online: boolean };

  let updating = false;
  let updateMsg = '';
  let refreshing = false;

  function uptime(s: number | null): string {
    if (s == null) return '—';
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  async function refresh() {
    refreshing = true;
    try {
      await invalidateAll();
    } finally {
      refreshing = false;
    }
  }

  async function runUpdate() {
    if (!confirm($t('system.update_confirm'))) return;
    updating = true;
    updateMsg = '';
    try {
      const res = await fetch('/api/update', { method: 'POST' });
      const j = await res.json();
      updateMsg = j.error ? '✗ ' + j.error : '✓ ' + (j.message ?? $t('system.update_started'));
    } catch (e) {
      updateMsg = '✗ ' + (e instanceof Error ? e.message : 'Fehler');
    } finally {
      updating = false;
    }
  }

  $: kpis = data.info
    ? [
        { label: $t('system.uptime'), value: uptime(data.info.uptime_s) },
        { label: $t('system.latency'), value: data.info.latency_ms != null ? `${data.info.latency_ms} ms` : '—' },
        { label: $t('system.guilds'), value: String(data.info.guild_count) },
        { label: $t('system.users'), value: data.info.user_count.toLocaleString() },
        { label: $t('system.memory'), value: data.info.memory_mb != null ? `${data.info.memory_mb} MB` : '—' },
        { label: $t('system.cogs'), value: `${data.info.cogs_loaded}/${data.info.cogs_available}` }
      ]
    : [];
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-2xl font-semibold">{$t('system.title')}</h1>
    {#if data.isOwner}
      <button
        type="button"
        class="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50"
        disabled={refreshing}
        on:click={refresh}>{refreshing ? '…' : '↻ ' + $t('common.refresh')}</button>
    {/if}
  </div>

  {#if !data.isOwner}
    <Card class="p-4"><p class="text-sm text-muted-foreground">{$t('system.owner_only')}</p></Card>
  {:else if !data.online || !data.info}
    <Card class="border-destructive/50 p-4"><p class="text-sm text-destructive">{$t('system.offline')}</p></Card>
  {:else}
    <!-- Kennzahlen -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {#each kpis as k (k.label)}
        <Card class="p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
          <p class="mt-1.5 text-xl font-semibold">{k.value}</p>
        </Card>
      {/each}
    </div>

    <!-- Versionen / Gateway -->
    <Card class="p-5">
      <h2 class="mb-3 text-base font-semibold">{$t('system.versions')}</h2>
      <div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div class="flex justify-between border-b border-border/50 py-1"><span class="text-muted-foreground">Red-DiscordBot</span><code>{data.info.red ?? '—'}</code></div>
        <div class="flex justify-between border-b border-border/50 py-1"><span class="text-muted-foreground">discord.py</span><code>{data.info.discord ?? '—'}</code></div>
        <div class="flex justify-between border-b border-border/50 py-1"><span class="text-muted-foreground">Python</span><code>{data.info.python ?? '—'}</code></div>
        <div class="flex justify-between border-b border-border/50 py-1"><span class="text-muted-foreground">Shards</span><code>{data.info.shard_count}</code></div>
        <div class="flex justify-between border-b border-border/50 py-1"><span class="text-muted-foreground">Dashboard-Beiträge</span><code>{data.info.contributions}</code></div>
        <div class="flex justify-between border-b border-border/50 py-1"><span class="text-muted-foreground">Gateway</span><code>{data.info.gateway_host}:{data.info.gateway_port}</code></div>
      </div>
    </Card>

    <!-- GitHub-Updater -->
    <Card class="p-5">
      <h2 class="mb-1 text-base font-semibold">{$t('system.update_title')}</h2>
      <p class="mb-3 text-sm text-muted-foreground">{$t('system.update_desc')}</p>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={updating}
          on:click={runUpdate}>{updating ? '…' : $t('system.update_btn')}</button>
        {#if updateMsg}<span class="text-sm text-muted-foreground">{updateMsg}</span>{/if}
      </div>
    </Card>
  {/if}
</div>
