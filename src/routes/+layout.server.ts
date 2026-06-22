import type { LayoutServerLoad } from './$types';
import { rpc } from '$lib/server/rpc';

export const load: LayoutServerLoad = async ({ locals }) => {
  // Custom Pages für die Navigation laden (öffentlich; Filterung nach Sichtbarkeit
  // passiert im Layout anhand des Login-Status).
  let pages: Array<{ slug: string; title: string; nav: boolean; visibility: string }> = [];
  try {
    const r = await rpc<{ pages: typeof pages }>('pages.list', {});
    pages = r.pages ?? [];
  } catch {
    /* Gateway offline o. ä. – Navigation funktioniert trotzdem. */
  }
  return { user: locals.user, pages };
};
