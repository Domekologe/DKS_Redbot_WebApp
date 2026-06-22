import { env } from '$env/dynamic/private';

/** Serverseitige Konfiguration (niemals an den Client ausliefern). */
export const config = {
  // Discord OAuth2
  discordClientId: env.DISCORD_CLIENT_ID ?? '',
  discordClientSecret: env.DISCORD_CLIENT_SECRET ?? '',
  discordRedirectUri: env.DISCORD_REDIRECT_URI ?? 'http://localhost:5173/auth/callback',

  // RPC-Gateway (Companion-Cog)
  gatewayUrl: env.GATEWAY_URL ?? 'http://127.0.0.1:6970',
  gatewayToken: env.GATEWAY_TOKEN ?? '',

  // Session
  sessionSecret: env.SESSION_SECRET ?? 'CHANGE_ME_dev_only_secret',
  cookieName: 'dks_session',
  sessionMaxAge: 60 * 60 * 24 * 7 // 7 Tage
};

export function assertConfig(): string[] {
  const missing: string[] = [];
  if (!config.discordClientId) missing.push('DISCORD_CLIENT_ID');
  if (!config.discordClientSecret) missing.push('DISCORD_CLIENT_SECRET');
  if (!config.gatewayToken) missing.push('GATEWAY_TOKEN');
  if (config.sessionSecret === 'CHANGE_ME_dev_only_secret') missing.push('SESSION_SECRET');
  return missing;
}
