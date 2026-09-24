// Lumen3D scene generator.
// Turns a plain-English description into a Lumen3D config object using a
// from-scratch keyword parser — no external API, fully offline. The result is
// a *raw* config; run it through schema.js `normalizeConfig` before rendering.

const COLORS = {
  red: '#ff4d4d', crimson: '#e01e5a', scarlet: '#ff2400',
  orange: '#ff8a3d', amber: '#ffb020', gold: '#ffd166', golden: '#ffd166',
  yellow: '#ffe14d', lime: '#b6ff3d',
  green: '#4de07a', emerald: '#2ecc71', mint: '#4de1c1', teal: '#2dd4bf',
  cyan: '#3ee6e6', aqua: '#4de1e8', turquoise: '#40e0d0',
  blue: '#4d7cff', azure: '#3aa0ff', sky: '#7cc4ff', navy: '#1b2a6b',
  indigo: '#5a4dff', purple: '#8a4dff', violet: '#8a7dff', magenta: '#ff4df0',
  pink: '#ff6ec7', rose: '#ff5c9e', salmon: '#ff8a7a',
  white: '#f4f6ff', silver: '#c9ccd6', gray: '#9aa0b0', grey: '#9aa0b0',
  black: '#111319', charcoal: '#1a1d28', chrome: '#c9ccd6', copper: '#c87b4a',
  brass: '#d1a24a', bronze: '#b08d57'
};

const SHAPES = {
  cube: 'box', box: 'box', block: 'box', crate: 'box',
  sphere: 'sphere', ball: 'sphere', orb: 'sphere', planet: 'sphere', bubble: 'sphere', moon: 'sphere', sun: 'sphere',
  torus: 'torus', donut: 'torus', doughnut: 'torus', ring: 'torus', tire: 'torus',
  knot: 'torusKnot', pretzel: 'torusKnot',
  cylinder: 'cylinder', tube: 'cylinder', pillar: 'cylinder', column: 'cylinder', pipe: 'cylinder', can: 'cylinder',
  cone: 'cone', pyramid: 'cone', spike: 'cone', tree: 'cone',
  crystal: 'icosahedron', gem: 'icosahedron', diamond: 'dodecahedron', rock: 'dodecahedron', asteroid: 'icosahedron', star: 'icosahedron'
};

const NUM_WORDS = {
  a: 1, an: 1, one: 1, single: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, several: 4, many: 6, few: 3
};

function has(text, ...words) {
  return words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(text));
}

function pickColors(text) {
  const found = [];
  for (const [name, hex] of Object.entries(COLORS)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(text)) found.push(hex);
  }
  return found;
}

// Detect "<n> <shape>" or "<shape>s" plural counts.
function detectShapes(text) {
  const out = [];
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  let pending = null; // a number word carries forward to the next shape
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (NUM_WORDS[w]) { pending = NUM_WORDS[w]; continue; }
    if (/^\d+$/.test(w)) { pending = Math.min(20, parseInt(w, 10)); continue; }
    const singular = w.endsWith('s') ? w.slice(0, -1) : w;
    const shape = SHAPES[w] || SHAPES[singular];
    if (shape) {
      let count = 1;
      if (pending != null) count = pending;
      else if (w.endsWith('s') && SHAPES[singular]) count = 3; // bare plural → a few
      out.push({ shape, count });
      pending = null;
    }
  }
  return out;
}

function moodPalette(text) {
  if (has(text, 'space', 'galaxy', 'cosmic', 'nebula', 'universe', 'stars?')) {
    return { top: '#241a55', bottom: '#03040a', accent: '#8a7dff', bloom: true, dark: true };
  }
  if (has(text, 'cyberpunk', 'neon', 'synthwave', 'retrowave', 'vaporwave')) {
    return { top: '#2a0a3a', bottom: '#060010', accent: '#ff4df0', bloom: true, dark: true };
  }
  if (has(text, 'sunset', 'dusk', 'warm', 'desert')) {
    return { top: '#3a1e2a', bottom: '#0a0505', accent: '#ff8a3d', bloom: true, dark: true };
  }
  if (has(text, 'ocean', 'underwater', 'sea', 'aqua', 'deep')) {
    return { top: '#0a2a45', bottom: '#02060f', accent: '#3ee6e6', bloom: true, dark: true };
  }
  if (has(text, 'forest', 'nature', 'jungle')) {
    return { top: '#14301f', bottom: '#040a06', accent: '#4de07a', bloom: false, dark: true };
  }
  if (has(text, 'clean', 'minimal', 'light', 'white', 'bright', 'studio')) {
    return { top: '#e8ecf5', bottom: '#c4cbdb', accent: '#5a4dff', bloom: false, dark: false };
  }
  // default: deep indigo night
  return { top: '#1b2350', bottom: '#05060d', accent: '#8a7dff', bloom: true, dark: true };
}

function detectMaterial(text, colors, mood) {
  const color = colors[0] || mood.accent;
  const glow = has(text, 'glow', 'glowing', 'neon', 'bright', 'emissive', 'luminous', 'radiant');
  const glass = has(text, 'glass', 'transparent', 'clear', 'translucent', 'see-through');
  const metal = has(text, 'metal', 'metallic', 'chrome', 'steel', 'gold', 'golden', 'silver', 'shiny', 'polished', 'mirror');
  const wire = has(text, 'wireframe', 'wire', 'mesh', 'grid', 'skeleton', 'outline');
  const matte = has(text, 'matte', 'clay', 'plastic', 'flat', 'rubber');

  if (wire) return { type: 'basic', color, wireframe: true };
  if (glass) {
    return { type: 'physical', color: '#ffffff', metalness: 0, roughness: 0.03,
      transmission: 0.92, transparent: true, opacity: 0.9, ior: 1.4, clearcoat: 1 };
  }
  if (metal) {
    return { type: 'standard', color, metalness: 1.0, roughness: 0.18 };
  }
  if (glow) {
    return { type: 'standard', color, emissive: color, emissiveIntensity: 2.2, roughness: 0.4 };
  }
  if (matte) {
    return { type: 'standard', color, metalness: 0.0, roughness: 0.85 };
  }
  // default: soft PBR
  return { type: 'physical', color, metalness: 0.35, roughness: 0.2, clearcoat: 0.6 };
}

function detectAnimation(text) {
  if (has(text, 'orbit', 'orbiting', 'circling', 'revolving')) return { type: 'orbit', speed: 0.7, radius: 3, height: 0.4 };
  if (has(text, 'float', 'floating', 'bob', 'bobbing', 'hover', 'hovering', 'drift', 'drifting')) return { type: 'float', speed: 1.1, amplitude: 0.35 };
  if (has(text, 'spin', 'spinning', 'rotate', 'rotating', 'turning', 'twirl')) return { type: 'spin', axis: 'y', speed: 0.6 };
  if (has(text, 'still', 'static', 'motionless', 'frozen')) return null;
  // default gentle motion
  return { type: 'float', speed: 0.9, amplitude: 0.25 };
}

function shapeGeometryParams(shape) {
  switch (shape) {
    case 'sphere': return { radius: 1.1, segments: 48 };
    case 'torus': return { radius: 1.0, tube: 0.35, segments: 48 };
    case 'torusKnot': return { radius: 1.0, tube: 0.34, segments: 64 };
    case 'cylinder': return { radius: 0.7, height: 2.0, segments: 48 };
    case 'cone': return { radius: 0.9, height: 1.8, segments: 48 };
    case 'icosahedron': return { radius: 1.2, detail: 1 };
    case 'dodecahedron': return { radius: 1.2 };
    case 'box':
    default: return { size: [1.5, 1.5, 1.5] };
  }
}

// Lay out n items centered on a line along X, lifted to y.
function layout(index, count, spacing = 3, y = 1.2) {
  const offset = (count - 1) / 2;
  return [(index - offset) * spacing, y, 0];
}

function titleFrom(desc) {
  const clean = desc.trim().replace(/\s+/g, ' ');
  if (!clean) return 'A 3D Scene';
  const short = clean.length > 60 ? clean.slice(0, 57).trim() + '…' : clean;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

// Main entry: description string -> raw Lumen3D config.
export function generateConfig(description, opts = {}) {
  const text = String(description || '').toLowerCase();
  const mood = moodPalette(text);
  const colors = pickColors(text);
  const anim = detectAnimation(text);

  // Which shapes were asked for?
  let shapeReqs = detectShapes(text);
  if (shapeReqs.length === 0) {
    // Nothing recognizable — give a nice default hero object.
    shapeReqs = [{ shape: 'icosahedron', count: 1 }];
  }

  // Flatten to individual objects, capped so scenes stay performant.
  const flat = [];
  for (const req of shapeReqs) {
    for (let i = 0; i < req.count; i++) flat.push(req.shape);
  }
  const shapes = flat.slice(0, 12);

  const objects = shapes.map((shape, i) => {
    // Rotate through detected colors so multiple objects differ.
    const colorPool = colors.length ? colors : [mood.accent];
    const color = colorPool[i % colorPool.length];
    const material = detectMaterial(text, [color], mood);
    // per-object color override for the pooled color
    if (material.type !== 'physical' || material.transmission === undefined) {
      material.color = material.color === '#ffffff' ? '#ffffff' : color;
    }
    const geom = shapeGeometryParams(shape);
    const spacing = shapes.length > 6 ? 2.4 : 3.0;
    return {
      id: `${shape}-${i}`,
      type: shape,
      ...geom,
      position: layout(i, shapes.length, spacing, 1.2),
      material,
      animation: anim
        ? (anim.type === 'orbit'
            ? { ...anim, radius: 1.6 + (i % 3) * 0.6 }
            : { ...anim, speed: anim.speed * (0.8 + (i % 3) * 0.2) })
        : null
    };
  });

  const wantsGround = !has(text, 'no ground', 'no floor', 'floating in space', 'empty', 'void');
  const showsGrid = !mood.dark ? false : !has(text, 'no grid');

  const config = {
    title: opts.title || titleFrom(description),
    description: 'Generated from a text prompt with Lumen3D.',
    scene: {
      background: { type: 'gradient', top: mood.top, bottom: mood.bottom },
      fog: mood.dark ? { color: mood.bottom, near: 14, far: 65 } : null,
      shadows: true,
      environment: true
    },
    camera: {
      fov: 50,
      position: shapes.length > 4 ? [0, 4, 12] : [4, 3.2, 8],
      lookAt: [0, 1.1, 0]
    },
    controls: {
      autoRotate: true,
      autoRotateSpeed: 0.5,
      enablePan: false,
      minDistance: 4,
      maxDistance: 30
    },
    lights: [
      { type: 'hemisphere', skyColor: mood.dark ? '#bcd4ff' : '#ffffff', groundColor: mood.top, intensity: mood.dark ? 0.5 : 0.9 },
      { type: 'directional', color: '#ffffff', intensity: 2.4, position: [6, 12, 6], castShadow: true },
      { type: 'point', color: mood.accent, intensity: 40, position: [-5, 4, -3] }
    ],
    ground: wantsGround
      ? { enabled: true, color: mood.dark ? '#0c0e1e' : '#d2d8e6',
          grid: showsGrid ? { divisions: 60, color1: mood.accent, color2: mood.dark ? '#171b30' : '#b9c1d4' } : false }
      : false,
    objects,
    effects: mood.bloom ? { bloom: { strength: 0.6, radius: 0.5, threshold: 0.8 } } : {},
    overlay: {
      subtitle: 'Made with Lumen3D',
      title: titleFrom(description),
      description: 'Drag to orbit · scroll to zoom. Edit the prompt or JSON to reshape this scene.',
      position: 'bottom-left',
      theme: mood.dark ? 'light' : 'dark',
      accent: mood.accent
    }
  };

  return config;
}

// Small explanation of what the parser understood — handy for the UI.
export function explain(description) {
  const text = String(description || '').toLowerCase();
  const shapes = detectShapes(text).map((s) => `${s.count}× ${s.shape}`);
  const colors = pickColors(text);
  const anim = detectAnimation(text);
  return {
    shapes: shapes.length ? shapes : ['default hero'],
    colors: colors.length ? colors : ['auto'],
    motion: anim ? anim.type : 'none',
    bloom: moodPalette(text).bloom
  };
}
