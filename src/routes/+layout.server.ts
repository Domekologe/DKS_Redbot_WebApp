import type { LayoutServerLoad } from './$types';
import { rpc } from '$lib/server/rpc';

type NavPage = { slug: string; title: string; nav: boolean; visibility: string };

// Modul-Cache: pages.list läuft sonst bei JEDER Navigation. Custom Pages ändern sich
// selten → kurzer TTL spart pro Seitenaufruf einen RPC-Roundtrip + Config-Read.
let _cache: { at: number; pages: NavPage[] } = { at: 0, pages: [] };
const TTL_MS = 30_000;

export const load: LayoutServerLoad = async ({ locals }) => {
  const now = Date.now();
  if (now - _cache.at > TTL_MS) {
    try {
      const r = await rpc<{ pages: NavPage[] }>('pages.list', {});
      _cache = { at: now, pages: r.pages ?? [] };
    } catch {
      // Gateway offline o. ä. – alten Cache behalten, aber TTL zurücksetzen.
      _cache = { at: now, pages: _cache.pages };
    }
  }
  return { user: locals.user, pages: _cache.pages };
};
