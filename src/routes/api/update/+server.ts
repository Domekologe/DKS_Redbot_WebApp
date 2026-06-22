import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spawn } from 'node:child_process';
import { rpc, authFromUser, RpcError } from '$lib/server/rpc';
import { env } from '$env/dynamic/private';

// Owner-only: stößt deploy/update.sh an (git pull + build + Service-Neustart).
// Standardmäßig DEAKTIVIERT – muss bewusst per ENABLE_SELF_UPDATE=true freigeschaltet
// werden, da es „neuesten main ausführen + neu bauen" bedeutet.
export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user) return json({ error: 'unauthorized' }, { status: 401 });

  // Owner über das Gateway verifizieren.
  try {
    const ov = await rpc<{ is_owner: boolean }>('dashboard.overview', {}, authFromUser(locals.user));
    if (!ov.is_owner) return json({ error: 'forbidden' }, { status: 403 });
  } catch (e) {
    return json({ error: e instanceof RpcError ? e.message : 'Gateway-Fehler' }, { status: 502 });
  }

  if ((env.ENABLE_SELF_UPDATE ?? '').toLowerCase() !== 'true') {
    return json(
      {
        error:
          'Self-Update ist deaktiviert. Setze ENABLE_SELF_UPDATE=true in der .env und erlaube ' +
          'dem Dienst-User den Service-Neustart (sudoers NOPASSWD für `systemctl restart dks-dashboard`).'
      },
      { status: 400 }
    );
  }

  try {
    // Detached starten, damit die Antwort noch rausgeht, bevor der Build/Neustart läuft.
    const child = spawn('bash', ['deploy/update.sh'], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return json({ ok: true, message: 'Update gestartet – die Web-App baut neu und startet in Kürze neu.' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Start fehlgeschlagen' }, { status: 500 });
  }
};
