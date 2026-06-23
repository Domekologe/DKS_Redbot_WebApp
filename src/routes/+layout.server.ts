import type { LayoutServerLoad } from './$types';
import { rpc } from '$lib/server/rpc';

type NavPage = { slug: string; title: string; nav: boolean; visibility: string };
type Branding = {
  title: string;
  icon: string;
  description: string;
  support_url: string;
  color: string;
  theme: string;
};

// Modul-Cache: pages.list/dashboard.branding laufen sonst bei JEDER Navigation. Beides
// ändert sich selten → kurzer TTL spart pro Seitenaufruf RPC-Roundtrips + Config-Reads.
let _cache: { at: number; pages: NavPage[]; branding: Branding | null } = {
  at: 0,
  pages: [],
  branding: null
};
const TTL_MS = 30_000;

export const load: LayoutServerLoad = async ({ locals }) => {
  const now = Date.now();
  if (now - _cache.at > TTL_MS) {
    try {
      const [p, b] = await Promise.all([
        rpc<{ pages: NavPage[] }>('pages.list', {}),
        rpc<Branding>('dashboard.branding', {})
      ]);
      _cache = { at: now, pages: p.pages ?? [], branding: b ?? null };
    } catch {
      // Gateway offline o. ä. – alten Cache behalten, aber TTL zurücksetzen.
      _cache = { at: now, pages: _cache.pages, branding: _cache.branding };
    }
  }
  return { user: locals.user, pages: _cache.pages, branding: _cache.branding };
};
