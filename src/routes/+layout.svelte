<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { setLocale, t, locale } from '$lib/i18n';
  export let data: {
    user: { username: string; avatar?: string | null } | null;
    pages?: Array<{ slug: string; title: string; nav: boolean; visibility: string }>;
  };

  // Custom Pages in der Navigation: öffentliche immer, private nur eingeloggt.
  $: navPages = (data.pages ?? []).filter((p) => p.nav && (p.visibility === 'public' || data.user));

  onMount(() => {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem('locale');
    if (saved) setLocale(saved);
  });

  function onLocaleChange(e: Event) {
    setLocale((e.target as HTMLSelectElement).value);
  }

  // Öffentliche Navigation (immer sichtbar); der Rest nur eingeloggt.
  const publicNav = [
    { href: '/', key: 'nav.overview' },
    { href: '/commands', key: 'nav.commands' }
  ];
</script>

<div class="flex min-h-screen">
  <aside class="hidden w-60 shrink-0 border-r border-border bg-card/40 p-4 md:block">
    <div class="mb-6 flex items-center gap-2 px-2">
      <span class="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">D</span>
      <span class="text-lg font-bold">{$t('app.title')}</span>
    </div>
    <nav class="space-y-1 text-sm">
      {#each publicNav as n}
        <a href={n.href} class="block rounded-md px-3 py-2 hover:bg-secondary">{$t(n.key)}</a>
      {/each}
      {#each navPages as p (p.slug)}
        <a href={`/p/${p.slug}`} class="block rounded-md px-3 py-2 hover:bg-secondary">
          {p.title}{#if p.visibility === 'private'}<span class="ml-1 text-xs text-muted-foreground" title={$t('nav.private_hint')}>🔒</span>{/if}
        </a>
      {/each}
      {#if data.user}
        <a href="/guilds" class="block rounded-md px-3 py-2 hover:bg-secondary">{$t('nav.guilds')}</a>
        <a href="/stats" class="block rounded-md px-3 py-2 hover:bg-secondary">{$t('nav.stats')}</a>
        <a href="/cogs" class="block rounded-md px-3 py-2 hover:bg-secondary">{$t('nav.cogs')}</a>
        <a href="/settings" class="block rounded-md px-3 py-2 hover:bg-secondary">{$t('nav.settings')}</a>
        <a href="/pages" class="block rounded-md px-3 py-2 hover:bg-secondary">{$t('nav.pages')}</a>
        <a href="/docs/integration" class="block rounded-md px-3 py-2 text-muted-foreground hover:bg-secondary">{$t('nav.integration_docs')}</a>
      {/if}
    </nav>
  </aside>

  <div class="flex flex-1 flex-col">
    <header class="flex items-center justify-between border-b border-border px-6 py-3">
      <div class="text-base font-bold md:hidden">{$t('app.title')}</div>
      <div class="ml-auto flex items-center gap-3">
        <select
          class="rounded-md border border-input bg-background px-2 py-1 text-sm"
          value={$locale}
          on:change={onLocaleChange}
        >
          <option value="de-DE">DE</option>
          <option value="en-US">EN</option>
        </select>
        {#if data.user}
          <span class="text-sm text-muted-foreground">{data.user.username}</span>
          {#if data.user.avatar}<img src={data.user.avatar} alt="" class="h-8 w-8 rounded-full" />{/if}
          <form method="POST" action="/logout">
            <button class="text-sm text-muted-foreground hover:text-foreground">{$t('common.logout')}</button>
          </form>
        {:else}
          <a
            href="/auth/login"
            class="inline-flex items-center justify-center rounded-md bg-[#5865F2] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            {$t('login.with_discord')}
          </a>
        {/if}
      </div>
    </header>
    <main class="flex-1 p-6">
      <slot />
    </main>
  </div>
</div>
