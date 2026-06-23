<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { setLocale, t, locale } from '$lib/i18n';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  export let data: {
    user: { username: string; avatar?: string | null } | null;
    pages?: Array<{ slug: string; title: string; nav: boolean; visibility: string }>;
    branding?: {
      title?: string;
      icon?: string;
      description?: string;
      support_url?: string;
      color?: string;
      theme?: string;
    } | null;
  };

  // Custom Pages in der Navigation: öffentliche immer, private nur eingeloggt.
  $: navPages = (data.pages ?? []).filter((p) => p.nav && (p.visibility === 'public' || data.user));

  // Branding-Titel/Icon (Fallback: i18n-App-Titel). Reaktiv, damit ein Speichern sofort greift.
  $: brandTitle = data.branding?.title?.trim() || $t('app.title');
  $: brandIcon = data.branding?.icon?.trim() || '';

  // Farb-Token (Branding-Farbe → CSS-Variable --primary, HSL).
  const PRIMARY: Record<string, string> = {
    indigo: '243 75% 59%',
    success: '142 71% 45%',
    blue: '217 91% 60%',
    red: '0 72% 51%'
  };

  function applyBranding() {
    if (typeof document === 'undefined') return;
    const c = data.branding?.color && PRIMARY[data.branding.color];
    if (c) document.documentElement.style.setProperty('--primary', c);
    document.title = brandTitle;
  }

  let theme = 'dark';
  onMount(() => {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem('locale');
    if (saved) setLocale(saved);
    const savedTheme = typeof localStorage !== 'undefined' && localStorage.getItem('theme');
    // Branding-Theme als Default, solange der Nutzer nicht selbst umgeschaltet hat.
    const effectiveTheme = savedTheme || data.branding?.theme || 'dark';
    if (effectiveTheme === 'light') {
      theme = 'light';
      document.documentElement.classList.remove('dark');
    } else {
      theme = 'dark';
      document.documentElement.classList.add('dark');
    }
    applyBranding();
  });

  // Bei Branding-Änderung (nach invalidateAll) Titel/Farbe sofort übernehmen.
  $: if (data.branding) applyBranding();

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (typeof localStorage !== 'undefined') localStorage.setItem('theme', theme);
  }

  function onLocaleChange(e: Event) {
    setLocale((e.target as HTMLSelectElement).value);
  }

  // Öffentliche Navigation (immer sichtbar); der Rest nur eingeloggt.
  const publicNav = [
    { href: '/', key: 'nav.overview' },
    { href: '/commands', key: 'nav.commands' }
  ];
</script>

<CommandPalette user={data.user} pages={data.pages ?? []} />

<div class="flex min-h-screen">
  <aside class="hidden w-60 shrink-0 border-r border-border bg-card/40 p-4 md:block">
    <div class="mb-6 flex items-center gap-2 px-2">
      {#if brandIcon}
        <img src={brandIcon} alt="" class="h-6 w-6 rounded-md object-cover" />
      {:else}
        <span class="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">{brandTitle.charAt(0).toUpperCase()}</span>
      {/if}
      <span class="text-lg font-bold">{brandTitle}</span>
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
        <a href="/announce" class="block rounded-md px-3 py-2 hover:bg-secondary">{$t('nav.announce')}</a>
        <a href="/cogs" class="block rounded-md px-3 py-2 hover:bg-secondary">{$t('nav.cogs')}</a>
        <a href="/settings" class="block rounded-md px-3 py-2 hover:bg-secondary">{$t('nav.settings')}</a>
        <a href="/pages" class="block rounded-md px-3 py-2 hover:bg-secondary">{$t('nav.pages')}</a>
        <a href="/audit" class="block rounded-md px-3 py-2 hover:bg-secondary">{$t('nav.audit')}</a>
        <a href="/system" class="block rounded-md px-3 py-2 hover:bg-secondary">{$t('nav.system')}</a>
        <a href="/docs/integration" class="block rounded-md px-3 py-2 text-muted-foreground hover:bg-secondary">{$t('nav.integration_docs')}</a>
      {/if}
    </nav>
  </aside>

  <div class="flex flex-1 flex-col">
    <header class="flex items-center justify-between border-b border-border px-6 py-3">
      <div class="text-base font-bold md:hidden">{brandTitle}</div>
      <div class="ml-auto flex items-center gap-3">
        <button
          type="button"
          class="rounded-md border border-input bg-background px-2 py-1 text-sm"
          title="Theme"
          on:click={toggleTheme}
        >{theme === 'dark' ? '☀️' : '🌙'}</button>
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
