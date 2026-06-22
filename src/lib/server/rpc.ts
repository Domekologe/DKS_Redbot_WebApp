import { config } from './env';
import type { SessionUser } from './session';

/** JSON-RPC-2.0-Client (HTTP POST) zum Gateway des Companion-Cogs. */
let _id = 0;

export interface RpcAuth {
  user_id: string;
  guild_id?: string | null;
  locale?: string;
}

export class RpcError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
  }
}

export async function rpc<T = unknown>(
  method: string,
  args: Record<string, unknown> = {},
  auth?: RpcAuth
): Promise<T> {
  const body = {
    jsonrpc: '2.0',
    id: ++_id,
    method,
    params: { auth: auth ?? null, args }
  };

  const res = await fetch(`${config.gatewayUrl}/rpc`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Dashboard-Token': config.gatewayToken
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new RpcError(res.status, `Gateway-HTTP-Fehler ${res.status}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new RpcError(json.error.code, json.error.message, json.error.data);
  }
  return json.result as T;
}

/** Hilfsfunktion: RPC im Kontext eines eingeloggten Users. */
export function authFromUser(user: SessionUser, guildId?: string | null): RpcAuth {
  return { user_id: user.id, guild_id: guildId ?? null, locale: user.locale };
}
