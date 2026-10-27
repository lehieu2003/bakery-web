/**
 * Guards a credential POST against login CSRF, where a cross-site form signs
 * the victim's browser into the attacker's account. Browsers always send
 * Origin on cross-site POSTs, so a present Origin must be this host; native
 * clients (the mobile app) send none and pass. JSON is required because a
 * plain HTML form cannot send it.
 */
export function checkCredentialRequest(
  request: Request,
): { ok: true } | { ok: false; status: 403 | 415 } {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return { ok: false, status: 415 };
  }

  const origin = request.headers.get('origin');
  if (!origin) return { ok: true };

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return { ok: false, status: 403 };
  }

  return host && originHost === host ? { ok: true } : { ok: false, status: 403 };
}
