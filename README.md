# ✦ Lumen3D

**Build interactive 3D websites from a single JSON file.** No build step, no
framework lock-in, zero npm dependencies. You describe a scene — objects,
materials, lights, camera, animations — and Lumen3D generates a deployable
static site powered by [Three.js](https://threejs.org).

```jsonc
{
  "title": "My 3D Site",
  "objects": [
    {
      "type": "icosahedron",
      "radius": 1.4,
      "material": { "type": "physical", "color": "#8a7dff", "clearcoat": 1 },
      "animation": { "type": "float", "speed": 1.1 }
    }
  ]
}
```

```bash
lumen dev      # preview at http://localhost:5173
lumen build    # output a deployable site to ./dist
```

That's the whole workflow. Drag to orbit, scroll to zoom — it's a real 3D scene.

Prefer a window over a terminal? There's a desktop app too. 👇

---

## 🖥️ Desktop app — Lumen3D Studio

A cross-platform Electron app: **type a description, watch the 3D scene appear**,
tweak the JSON live, and export a deployable website with one click. No CLI, no
JSON knowledge required to start.

- **Prompt box** — "a glowing purple crystal floating in space" → an actual
  scene. The parser understands shapes, colors, materials (glass / metal /
  neon / wireframe), counts ("five cubes"), motion (spin / float / orbit), and
  mood ("space", "cyberpunk", "underwater", "minimal white studio").
- **Live preview** — the scene renders as you type; regenerating disposes the
  old scene cleanly.
- **Editable JSON** — full control when you want it; "Apply edits" re-renders.
- **Export** — writes a static site (CDN or fully self-contained) to any folder.

### Run it from source

```bash
npm install          # pulls electron + three
npm run app          # launches Lumen3D Studio
```

### Get a Windows `.exe` (installer + portable)

```bash
npm install
npm run dist:win     # → release/Lumen3D-Studio-Setup-*.exe  (and a portable .exe)
```

`npm run dist:mac` and `npm run dist:linux` build a `.dmg` / `.AppImage`
respectively. Building a Windows `.exe` must happen **on Windows** (or in CI).

### Or let CI build the `.exe` for you

This repo ships [`.github/workflows/build-desktop.yml`](./.github/workflows/build-desktop.yml).
Open the **Actions** tab → **Build desktop app** → **Run workflow**, or push a
`v*` tag. It builds on Windows, macOS, and Linux runners and uploads the
installers as downloadable artifacts — so you get a real `.exe` without owning a
Windows machine.

---

## 💸 Selling Pro licenses

Lumen3D ships a complete freemium system so you can charge for a Pro tier. Free
users get the full builder; **Pro removes the "built with Lumen3D" watermark
from exported sites and unlocks the premium template gallery.** Licenses are
verified **offline** with public-key crypto (ECDSA P-256) — no server to run.

### 1. Create your signing keys (once)

```bash
node tools/license-keygen.mjs > keys.json    # keep keys.json SECRET (gitignored)
```

Copy the `public` object from `keys.json` into `src/license-config.js`
(`PUBLIC_JWK`). This ties valid licenses to *your* private key. (A demo key
ships by default — replace it before selling.)

### 2. Sell, then mint a key per buyer

```bash
node tools/license-sign.mjs --keys keys.json --email buyer@example.com
# → prints the license key to send to the buyer
#   optional: --tier studio   --days 365 (perpetual if omitted)
```

The buyer pastes the key into **Lumen3D Studio → "Have a license key?" →
Activate**, or exports from the CLI with `lumen build --license <key>`.

### 3. Hands-off sales via Gumroad / Lemon Squeezy

For fully automated sales (buyer pays → gets key → activates, no manual step):

1. Create a product on [Gumroad](https://gumroad.com) and enable **license
   keys** for it.
2. In `src/license-config.js` set `mode: 'gumroad'` and paste your
   `gumroadProductId`, and set `purchaseUrl` to your product page.
3. The app now verifies the buyer's Gumroad key against Gumroad's API on
   activation. The **✦ Upgrade to Pro** button sends people to `purchaseUrl`.

> Pricing ideas: a one-time **$19–39 Pro** license (watermark removal +
> premium templates) converts well for a creative tool; add a **template pack**
> or **commercial-use** tier later.

**Note on open source:** the code is MIT, so the honest business is selling
convenience and polish (signed builds, premium templates, support), not gating
the source. The watermark + premium gallery are the value people pay for.

---

## Why

Spinning up a 3D website usually means wiring a bundler, learning the Three.js
API, and writing render loops before you can put a single glowing shape on the
screen. Lumen3D collapses that into a declarative config: the common 90% (PBR
materials, orbit controls, shadows, bloom, an HTML overlay) is done for you, and
the config is plain JSON so it's trivial to generate, template, or edit by hand.

- **Zero dependencies** to run the CLI (Node's standard library only).
- **CDN or self-contained.** Ship a tiny site that pulls Three.js from a CDN, or
  `--vendor` to bundle Three.js locally so the site works fully offline.
- **Deploy anywhere.** The output is static `index.html` + `engine.js` +
  `config.json`. Drop it on GitHub Pages, Netlify, Vercel, S3, whatever.

---

## Install

Requires **Node.js 18+**.

```bash
# clone this repo, then from the repo root:
npm link          # makes the `lumen` command available globally
# — or run without installing —
node bin/cli.js <command>
```

> Once published to npm you'd `npm install -g lumen3d`. For now, `npm link` or
> the direct `node bin/cli.js` invocation works out of the box.

---

## Quick start

```bash
lumen init my-site        # scaffold a starter lumen.config.json
cd my-site
lumen dev                 # live preview, reloads when you edit the config
```

Edit `lumen.config.json`, refresh the browser, watch it change. When you're
happy:

```bash
lumen build               # → ./dist  (loads Three.js from CDN)
lumen build --vendor      # → ./dist  (self-contained, needs: npm install three)
```

Try the bundled demo without scaffolding anything:

```bash
node bin/cli.js dev --config examples/showcase.json
```

---

## Commands

| Command | What it does |
| --- | --- |
| `lumen init [dir]` | Write a starter `lumen.config.json` into `dir` (default: current folder). |
| `lumen dev [--config f] [--port n]` | Serve a live preview. Rebuilds on each request; edits to the config show on refresh. Default port `5173`. |
| `lumen build [--config f] [--out dir] [--vendor]` | Generate a static site. Default config `lumen.config.json`, default output `dist`. |

**`--vendor`** copies Three.js out of your project's `node_modules` into
`dist/vendor/` and rewrites the page to load it locally. Run
`npm install three` first. Without `--vendor`, the page loads Three.js from
`cdn.jsdelivr.net` via an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap).

---

## Config reference

Every field is optional and has a sensible default — a config of `{}` renders a
valid (if empty) scene. See [`examples/`](./examples) for complete files:
[`minimal.json`](./examples/minimal.json),
[`starter.json`](./examples/starter.json),
[`showcase.json`](./examples/showcase.json).

### Top level

```jsonc
{
  "title": "My 3D Site",           // <title> + og:title
  "description": "…",              // meta description
  "threeVersion": "0.169.0",       // CDN version of three.js (CDN mode only)
  "scene":   { … },
  "camera":  { … },
  "controls":{ … },
  "lights":  [ … ],
  "ground":  { … },
  "objects": [ … ],
  "effects": { … },
  "overlay": { … }
}
```

### `scene`

```jsonc
"scene": {
  // solid color …
  "background": "#0b0d1a",
  // … or a vertical gradient
  "background": { "type": "gradient", "top": "#1b2350", "bottom": "#05060d" },

  "fog": { "color": "#05060d", "near": 12, "far": 55 },   // or {"type":"exp2","density":0.02}
  "shadows": true,        // enable shadow maps
  "environment": true,    // image-based lighting for realistic PBR reflections
  "exposure": 1.0         // tone-mapping exposure
}
```

### `camera` & `controls`

```jsonc
"camera": {
  "fov": 50,
  "position": [6, 4, 8],
  "lookAt": [0, 0, 0]
},
"controls": {
  "autoRotate": true,
  "autoRotateSpeed": 0.6,
  "enableZoom": true,
  "enablePan": false,
  "minDistance": 4,
  "maxDistance": 16,
  "maxPolarAngle": 1.5    // clamp how far under the floor you can orbit
}
```

### `lights`

An array. Types: `ambient`, `hemisphere`, `directional`, `point`, `spot`.

```jsonc
"lights": [
  { "type": "hemisphere", "skyColor": "#bcd4ff", "groundColor": "#2a2f4a", "intensity": 0.6 },
  { "type": "directional", "color": "#ffffff", "intensity": 2.4, "position": [6, 10, 5], "castShadow": true },
  { "type": "point", "color": "#8a7dff", "intensity": 30, "position": [-4, 3, -3] }
]
```

If you omit `lights`, a reasonable hemisphere + key-light rig is used.

### `objects`

The heart of the scene. Each object:

```jsonc
{
  "id": "hero",
  "type": "icosahedron",          // see table below
  "radius": 1.4, "detail": 1,     // geometry params depend on type
  "position": [0, 1.4, 0],
  "rotation": [0, 0, 0],          // radians
  "scale": [1, 1, 1],
  "castShadow": true,
  "receiveShadow": false,
  "material": { … },
  "animation": { … }
}
```

**Geometry types & their params**

| `type` | params |
| --- | --- |
| `box` | `size: [x,y,z]` |
| `sphere` | `radius`, `segments` |
| `plane` | `size: [w,h]` |
| `cylinder` | `radius`, `height`, `segments` |
| `cone` | `radius`, `height`, `segments` |
| `torus` | `radius`, `tube`, `segments` |
| `torusKnot` | `radius`, `tube`, `segments` |
| `icosahedron` | `radius`, `detail` |
| `dodecahedron` | `radius`, `detail` |
| `model` | `src` — URL to a `.glb`/`.gltf` file |

**`material`**

```jsonc
"material": {
  "type": "standard",       // standard | physical | basic | normal
  "color": "#8a7dff",
  "metalness": 0.4,
  "roughness": 0.15,
  "emissive": "#2a2050",    // glow color …
  "emissiveIntensity": 0.4, // … pairs beautifully with effects.bloom
  "wireframe": false,
  "opacity": 1,
  "transparent": false,
  // physical-only:
  "clearcoat": 1,
  "transmission": 0.9,      // glass
  "ior": 1.4
}
```

**`animation`**

| `type` | behavior | params |
| --- | --- | --- |
| `spin` / `rotate` | constant rotation | `axis` (`x`/`y`/`z`), `speed` |
| `float` | bob up and down + slow spin | `speed`, `amplitude` |
| `orbit` | circle around its start point | `speed`, `radius`, `height` |

### `ground`

```jsonc
"ground": {
  "enabled": true,
  "size": 60,
  "color": "#0e1024",
  "receiveShadow": true,
  "grid": { "divisions": 48, "color1": "#2a3155", "color2": "#161a30" }  // or false
}
```

Set `"ground": false` to remove it entirely.

### `effects`

```jsonc
"effects": {
  "bloom": { "strength": 0.6, "radius": 0.4, "threshold": 0.85 }   // or omit for none
}
```

Bloom makes emissive materials and bright highlights glow. Pair it with high
`emissiveIntensity` on a material for neon-style objects.

### `overlay`

An optional HTML UI layer rendered over the canvas (hero text + call-to-action
buttons):

```jsonc
"overlay": {
  "subtitle": "Made with Lumen3D",
  "title": "Hello, 3D web.",
  "description": "Drag to orbit, scroll to zoom.",
  "position": "bottom-left",     // bottom-left | top-left | bottom-center | center
  "theme": "light",              // light | dark (text color)
  "accent": "#8a7dff",
  "links": [
    { "label": "Get started", "url": "#" },
    { "label": "GitHub", "url": "https://github.com/…" }
  ]
}
```

All overlay text is HTML-escaped before injection.

---

## Loading a 3D model

Point an object at a hosted `.glb`/`.gltf`:

```jsonc
{
  "type": "model",
  "src": "https://example.com/robot.glb",
  "position": [0, 0, 0],
  "scale": [1, 1, 1],
  "animation": { "type": "float", "speed": 0.8 }
}
```

Models honor `castShadow` / `receiveShadow` and animations just like primitives.

---

## Deploying

`lumen build` produces a plain static folder:

```
dist/
  index.html
  engine.js
  config.json
  vendor/        (only with --vendor)
```

Serve it from any static host. For GitHub Pages, push `dist/` to a `gh-pages`
branch or point Pages at a `/docs` folder. Nothing server-side is required.

---

## How it works

1. The CLI reads your config and runs it through `src/schema.js`, which fills in
   every default so the browser engine never has to guard for missing fields.
2. `src/builder.js` renders `src/templates/index.html` (title, meta, import map)
   and writes the normalized config out as `config.json`.
3. In the browser, `src/runtime/engine.js` fetches `config.json` and constructs
   the Three.js scene: geometries, materials, lights, ground, post-processing,
   the overlay, a resize handler, and the render loop.

The config is the single source of truth. The generated site is just the engine
plus your JSON.

---

## Project layout

```
bin/cli.js            CLI entry (init / dev / build)
src/generate.js       text prompt → scene config (offline, no API)
src/schema.js         config normalization + defaults
src/builder.js        config → static site (+ optional vendoring)
src/server.js         zero-dep dev server
src/templates/        HTML shell
src/runtime/engine.js browser-side Three.js engine (mount / boot)
src/license.js        offline license verification (ECDSA P-256)
src/license-config.js public key + storefront settings (ships in app)
tools/license-*.mjs   seller key tools (keygen + sign)
app/main.js           Electron main process (window + export + license)
app/preload.cjs       context-isolated IPC bridge
app/renderer/         Studio UI (prompt, preview, JSON editor, Pro)
app/renderer/premium.js  premium template gallery (Pro-gated)
.github/workflows/    CI that builds the desktop installers
examples/             sample configs
```

---

## Contributing

Issues and PRs welcome. Ideas that fit the spirit of the project: more geometry
types, particle systems, scroll-driven camera paths, a small visual editor that
writes the JSON.

## License

[MIT](./LICENSE)
