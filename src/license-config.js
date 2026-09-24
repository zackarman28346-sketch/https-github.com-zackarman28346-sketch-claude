// Lumen3D license configuration — this file SHIPS in the app.
//
// It contains only the PUBLIC verification key (safe to distribute) and your
// storefront settings. To make license keys valid ONLY for you:
//   1. run:  node tools/license-keygen.mjs > keys.json   (keep keys.json secret)
//   2. paste the "public" object from keys.json into PUBLIC_JWK below
//   3. sign buyer keys with:  node tools/license-sign.mjs --keys keys.json --email ...
//
// The default key below is a demo key — replace it before selling, or anyone
// with the matching demo private key could mint Pro keys.

export const LICENSE = {
  // 'offline'  → verify signed keys locally (no server, works offline)
  // 'gumroad'  → verify keys against the Gumroad API (hands-off sales)
  mode: 'offline',

  // Public key for offline verification (from license-keygen.mjs).
  // Production key — the matching private key lives only in your keys.json.
  PUBLIC_JWK: {
    kty: 'EC',
    crv: 'P-256',
    x: 'VJP8mBNYkouZJkmJxs5bG1Fr7E_xrdevJUNvLVmdjug',
    y: 'wZa4RKhi80R8alk2O6if7Eku0kmcaTNGyRmJ62ZnnAQ'
  },

  // For mode: 'gumroad' — your Gumroad product's ID (Product → Advanced).
  gumroadProductId: '',

  // Where the "Upgrade to Pro" button sends people.
  purchaseUrl: 'https://gumroad.com/'
};

// Convenience config for verifyLicense().
export function verifierConfig() {
  return {
    mode: LICENSE.mode,
    publicJwk: LICENSE.PUBLIC_JWK,
    gumroadProductId: LICENSE.gumroadProductId
  };
}
