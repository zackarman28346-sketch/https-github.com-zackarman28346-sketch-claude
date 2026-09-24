# Lumen3D — Seller setup checklist

Most of this is **already done for you**. What's left needs *your* accounts /
your machine, which nobody can do on your behalf.

## ✅ Already configured (in this repo)

- **Signing keys generated.** `src/license-config.js` holds *your* public key.
  The matching private key was delivered to you separately as `keys.json`
  (also called `prod-keys.json`). **Keep it secret and never commit it.**
- **10 sellable license keys** were pre-minted and delivered to you as
  `license-keys-to-sell.txt`. You can sell these today (hand one to each buyer).
- **Licensing + watermark gating** wired into the app and CLI, tested.
- **CI build** is set up (`.github/workflows/build-desktop.yml`) — pushing a
  `v*` tag builds the Windows/macOS/Linux installers automatically.

## 🔨 Things only you can do

### 1. Get the installers (the `.exe`)
Either:
- **CI (no Windows needed):** a `v0.1.0` tag was pushed to trigger the build.
  Go to your repo → **Actions** tab → **Build desktop app** → download the
  `lumen3d-studio-windows` artifact. *(If Actions are disabled, enable them in
  Settings → Actions.)*
- **Locally on Windows:** `npm install && npm run dist:win` →
  `release/Lumen3D-Studio-Setup-*.exe`.

### 2. Set up payments (Gumroad — ~10 min)
1. Create an account at <https://gumroad.com> and add your payout method
   (this needs your identity + bank/PayPal — that's why only you can do it).
2. New product → set price (suggested: **$29 one-time**). Under the product's
   **Content**, deliver a license key from `license-keys-to-sell.txt` (or turn
   on Gumroad's own license keys — see option B below).
3. Copy your product page URL into `src/license-config.js` → `purchaseUrl`.

**Option B (fully automated):** enable Gumroad's built-in license keys on the
product, then in `src/license-config.js` set `mode: 'gumroad'` and paste your
`gumroadProductId`. Now buyers get a key automatically and the app verifies it
against Gumroad — you never touch a key by hand.

### 3. (Optional) Publish / distribute
- Put the installer on your Gumroad product, itch.io, or a GitHub Release.
- Tell people. This is the part that actually earns — the machine is ready,
  distribution is the job.

## 🔑 Minting more keys later (Option A)

```bash
node tools/license-sign.mjs --keys keys.json --email buyer@example.com
# --tier studio   --days 365   (perpetual if --days omitted)
```

## 🔐 Security notes
- `keys.json` = your money-printer's private half. Back it up; never commit it
  (it's gitignored). If it leaks, run `license-keygen.mjs` again, update the
  public key in `src/license-config.js`, and ship an update.
- The public key in the app is safe to distribute (that's the point).
