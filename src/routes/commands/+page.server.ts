import type { PageServerLoad } from './$types';
import { rpc } from '$lib/server/rpc';

// Öffentliche Seite: ohne Login erreichbar. Zeigt nur aktive Commands.
export const load: PageServerLoad = async ({ locals }) => {
  let data: any = { bot: null, prefix: [], slash: [], counts: { prefix: 0, slash: 0 } };
  let online = true;
  try {
    data = await rpc('core.commands', {});
  } catch {
    online = false;
  }
  return { commands: data, online, user: locals.user };
};
