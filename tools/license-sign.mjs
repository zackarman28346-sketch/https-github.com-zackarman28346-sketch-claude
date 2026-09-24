#!/usr/bin/env node
// Mint a signed Lumen3D license key for a buyer.
//
// Usage:
//   node tools/license-sign.mjs --keys keys.json --email buyer@example.com [--tier pro] [--days 0]
//
//   --keys   path to the JSON from license-keygen.mjs (contains the private key)
//   --email  the buyer's email (embedded in the key, shown in the app)
//   --tier   pro | studio            (default: pro)
//   --days   expiry in days; 0 or omitted = perpetual license
//
// Deliver the printed key to the buyer (e.g. as the Gumroad/Lemon Squeezy
// product content, or by email). They paste it into Lumen3D Studio.

import { promises as fs } from 'node:fs';
import { signPayload } from '../src/license.js';

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const keysPath = arg('keys');
const email = arg('email');
const tier = arg('tier', 'pro');
const days = Number(arg('days', '0'));

if (!keysPath || !email) {
  console.error('Usage: node tools/license-sign.mjs --keys keys.json --email buyer@example.com [--tier pro] [--days 0]');
  process.exit(1);
}

const keys = JSON.parse(await fs.readFile(keysPath, 'utf8'));
const privateJwk = keys.private || keys.privateJwk || keys;

const payload = { email, tier, iat: Date.now() };
if (days > 0) payload.exp = Date.now() + days * 24 * 60 * 60 * 1000;

const key = await signPayload(payload, privateJwk);

console.error(`\nLicense for ${email} (${tier}${days > 0 ? `, ${days}d` : ', perpetual'}):`);
console.log(key);
console.error('');
