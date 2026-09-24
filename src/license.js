// Lumen3D licensing — offline-verifiable Pro license keys.
//
// A license key is:  base64url(payloadJSON) + "." + base64url(signature)
// The payload is signed with the seller's ECDSA P-256 private key; the app
// ships only the PUBLIC key and verifies signatures offline. Nobody can forge
// a key without the private key, and verification needs no server.
//
// This module is dependency-free and runs in both Node (>=18) and the browser
// (Electron renderer), using the standard WebCrypto API.

const subtle = globalThis.crypto && globalThis.crypto.subtle;

const TIERS = { free: 0, pro: 1, studio: 2 };

// ---- base64url helpers (portable: Node + browser) ----
function bytesToB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToString(s) {
  return new TextDecoder().decode(b64urlToBytes(s));
}

function stringToBytes(s) {
  return new TextEncoder().encode(s);
}

// ---- signing (used by the seller's key tools) ----
export async function signPayload(payload, privateJwk) {
  const key = await subtle.importKey(
    'jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const data = stringToBytes(JSON.stringify(payload));
  const sig = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data));
  return bytesToB64url(data) + '.' + bytesToB64url(sig);
}

// ---- offline verification (used by the app + CLI) ----
export async function verifyOffline(licenseKey, publicJwk) {
  if (!subtle) return { valid: false, reason: 'no-webcrypto' };
  if (typeof licenseKey !== 'string' || !licenseKey.includes('.')) {
    return { valid: false, reason: 'malformed' };
  }
  const [payloadPart, sigPart] = licenseKey.trim().split('.');
  let payload;
  try {
    payload = JSON.parse(b64urlToString(payloadPart));
  } catch {
    return { valid: false, reason: 'bad-payload' };
  }
  try {
    const key = await subtle.importKey(
      'jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    );
    const ok = await subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      b64urlToBytes(sigPart),
      b64urlToBytes(payloadPart)
    );
    if (!ok) return { valid: false, reason: 'bad-signature' };
  } catch {
    return { valid: false, reason: 'verify-error' };
  }
  if (payload.exp && Date.now() > payload.exp) {
    return { valid: false, reason: 'expired', email: payload.email, tier: payload.tier };
  }
  return {
    valid: true,
    tier: payload.tier || 'pro',
    email: payload.email || null,
    exp: payload.exp || null
  };
}

// ---- online verification via Gumroad (for real, hands-off sales) ----
// Gumroad auto-generates a license key per sale; this validates it against
// their API. Requires network at activation time.
export async function verifyGumroad(licenseKey, productId, fetchImpl = globalThis.fetch) {
  if (!fetchImpl) return { valid: false, reason: 'no-fetch' };
  try {
    const body = new URLSearchParams({
      product_id: productId,
      license_key: licenseKey,
      increment_uses_count: 'false'
    });
    const res = await fetchImpl('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const json = await res.json();
    if (json && json.success && json.purchase && !json.purchase.refunded && !json.purchase.disputed) {
      return { valid: true, tier: 'pro', email: json.purchase.email || null };
    }
    return { valid: false, reason: 'gumroad-invalid' };
  } catch (err) {
    return { valid: false, reason: 'gumroad-error', error: String(err && err.message) };
  }
}

// ---- dispatcher ----
// config: { mode: 'offline'|'gumroad', publicJwk?, gumroadProductId? }
export async function verifyLicense(licenseKey, config) {
  if (!licenseKey) return { valid: false, reason: 'empty' };
  if (config && config.mode === 'gumroad' && config.gumroadProductId) {
    return verifyGumroad(licenseKey, config.gumroadProductId);
  }
  if (config && config.publicJwk) {
    return verifyOffline(licenseKey, config.publicJwk);
  }
  return { valid: false, reason: 'unconfigured' };
}

export function tierAtLeast(tier, min) {
  return (TIERS[tier] || 0) >= (TIERS[min] || 0);
}

export function isPro(result) {
  return !!(result && result.valid && tierAtLeast(result.tier || 'pro', 'pro'));
}

export { TIERS };
