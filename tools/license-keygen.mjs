#!/usr/bin/env node
// Generate a Lumen3D license signing keypair (run ONCE, keep the private key
// secret). Prints:
//   - the PUBLIC key JWK to paste into src/license-config.js (ships in the app)
//   - the PRIVATE key JWK to save somewhere safe (used to sign license keys)
//
// Usage: node tools/license-keygen.mjs [> keys.json]

import { webcrypto as crypto } from 'node:crypto';

const pair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);

const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);

// Trim to the fields we need and keep them stable.
const pub = { kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x, y: publicJwk.y };

console.error('\n=== PUBLIC KEY (paste into src/license-config.js -> PUBLIC_JWK) ===');
console.log(JSON.stringify({ public: pub, private: privateJwk }, null, 2));
console.error('\n=== PRIVATE KEY is in the "private" field above. KEEP IT SECRET. ===');
console.error('Save this output to a file you do NOT commit (e.g. keys.json).\n');
