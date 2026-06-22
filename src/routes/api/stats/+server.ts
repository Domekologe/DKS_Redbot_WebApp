import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rpc, authFromUser, RpcError } from '$lib/server/rpc';

const METHODS: Record<string, string> = {
  overview: 'serverstats.overview',
  messages: 'serverstats.messages',
  voice: 'serverstats.voice',
  status: 'serverstats.status',
  invites: 'serverstats.invites',
  activity: 'serverstats.activity',
  member_drilldown: 'serverstats.member_drilldown',
  channel_drilldown: 'serverstats.channel_drilldown'
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) return json({ error: 'unauthorized' }, { status: 401 });
  const { section, guildId, days, member_id, channel_id } = await request.json();
  const method = METHODS[section];
  if (!method) return json({ error: 'unbekannte Sektion' }, { status: 400 });
  if (!guildId) return json({ error: 'guildId fehlt' }, { status: 400 });
  const auth = authFromUser(locals.user, guildId);
  try {
    return json(await rpc(method, { days, member_id, channel_id }, auth));
  } catch (e) {
    return json({ error: e instanceof RpcError ? e.message : 'Fehler' }, { status: 502 });
  }
};
