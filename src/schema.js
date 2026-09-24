// Config normalization + defaults for Lumen3D.
// Keeps the runtime engine simple: by the time a config reaches the browser,
// every field it reads is guaranteed to exist.

const THREE_VERSION = '0.169.0';

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function vec3(v, fallback) {
  if (Array.isArray(v) && v.length === 3) return v.map(Number);
  if (typeof v === 'number') return [v, v, v];
  return fallback.slice();
}

function num(v, fallback) {
  return typeof v === 'number' && !Number.isNaN(v) ? v : fallback;
}

function bool(v, fallback) {
  return typeof v === 'boolean' ? v : fallback;
}

function str(v, fallback) {
  return typeof v === 'string' ? v : fallback;
}

function normalizeBackground(bg) {
  if (typeof bg === 'string') return { type: 'color', color: bg };
  if (!isObject(bg)) return { type: 'color', color: '#0b0d1a' };
  if (bg.type === 'gradient') {
    return {
      type: 'gradient',
      top: str(bg.top, '#1a2140'),
      bottom: str(bg.bottom, '#05060d')
    };
  }
  return { type: 'color', color: str(bg.color, '#0b0d1a') };
}

function normalizeFog(fog) {
  if (!isObject(fog)) return null;
  if (fog.type === 'exp2') {
    return { type: 'exp2', color: str(fog.color, '#0b0d1a'), density: num(fog.density, 0.02) };
  }
  return {
    type: 'linear',
    color: str(fog.color, '#0b0d1a'),
    near: num(fog.near, 10),
    far: num(fog.far, 60)
  };
}

function normalizeCamera(cam) {
  cam = isObject(cam) ? cam : {};
  return {
    fov: num(cam.fov, 50),
    near: num(cam.near, 0.1),
    far: num(cam.far, 1000),
    position: vec3(cam.position, [6, 4, 8]),
    lookAt: vec3(cam.lookAt, [0, 0, 0])
  };
}

function normalizeControls(c) {
  c = isObject(c) ? c : {};
  return {
    enabled: bool(c.enabled, true),
    autoRotate: bool(c.autoRotate, false),
    autoRotateSpeed: num(c.autoRotateSpeed, 1.0),
    enableZoom: bool(c.enableZoom, true),
    enablePan: bool(c.enablePan, false),
    enableDamping: bool(c.enableDamping, true),
    dampingFactor: num(c.dampingFactor, 0.05),
    minDistance: num(c.minDistance, 0),
    maxDistance: num(c.maxDistance, Infinity),
    minPolarAngle: num(c.minPolarAngle, 0),
    maxPolarAngle: num(c.maxPolarAngle, Math.PI)
  };
}

function normalizeLight(l, i) {
  l = isObject(l) ? l : {};
  const type = str(l.type, 'directional');
  const base = {
    type,
    color: str(l.color, '#ffffff'),
    intensity: num(l.intensity, 1)
  };
  if (type === 'hemisphere') {
    return {
      ...base,
      skyColor: str(l.skyColor || l.color, '#ffffff'),
      groundColor: str(l.groundColor, '#444466'),
      position: vec3(l.position, [0, 20, 0])
    };
  }
  if (type === 'ambient') {
    return base;
  }
  // directional / point / spot
  return {
    ...base,
    position: vec3(l.position, [8, 12, 6]),
    castShadow: bool(l.castShadow, type === 'directional'),
    distance: num(l.distance, 0),
    angle: num(l.angle, Math.PI / 6),
    penumbra: num(l.penumbra, 0.3),
    _id: 'light-' + i
  };
}

function normalizeLights(lights) {
  if (!Array.isArray(lights) || lights.length === 0) {
    return [
      { type: 'hemisphere', skyColor: '#bcd4ff', groundColor: '#2a2f4a', intensity: 0.7, position: [0, 20, 0] },
      { type: 'directional', color: '#ffffff', intensity: 2.2, position: [8, 12, 6], castShadow: true, _id: 'light-key' }
    ];
  }
  return lights.map(normalizeLight);
}

function normalizeMaterial(m) {
  m = isObject(m) ? m : {};
  return {
    type: str(m.type, 'standard'),
    color: str(m.color, '#8a7dff'),
    metalness: num(m.metalness, 0.2),
    roughness: num(m.roughness, 0.45),
    emissive: str(m.emissive, '#000000'),
    emissiveIntensity: num(m.emissiveIntensity, 1),
    wireframe: bool(m.wireframe, false),
    opacity: num(m.opacity, 1),
    transparent: bool(m.transparent, num(m.opacity, 1) < 1),
    flatShading: bool(m.flatShading, false),
    clearcoat: num(m.clearcoat, 0),
    transmission: num(m.transmission, 0),
    ior: num(m.ior, 1.5)
  };
}

function normalizeAnimation(a) {
  if (!isObject(a)) return null;
  return {
    type: str(a.type, 'spin'),
    speed: num(a.speed, 1),
    axis: str(a.axis, 'y'),
    amplitude: num(a.amplitude, 0.5),
    radius: num(a.radius, 3),
    height: num(a.height, 0)
  };
}

function normalizeObject(o, i) {
  o = isObject(o) ? o : {};
  return {
    id: str(o.id, 'obj-' + i),
    type: str(o.type, 'box'),
    src: str(o.src, ''), // for type: model (gltf/glb url)
    size: vec3(o.size, [1, 1, 1]),
    radius: num(o.radius, 1),
    tube: num(o.tube, 0.35),
    detail: num(o.detail, 0),
    segments: num(o.segments, 48),
    height: num(o.height, 1.5),
    position: vec3(o.position, [0, 0, 0]),
    rotation: vec3(o.rotation, [0, 0, 0]),
    scale: vec3(o.scale, [1, 1, 1]),
    castShadow: bool(o.castShadow, true),
    receiveShadow: bool(o.receiveShadow, false),
    material: normalizeMaterial(o.material),
    animation: normalizeAnimation(o.animation)
  };
}

function normalizeGround(g) {
  if (g === false) return { enabled: false };
  g = isObject(g) ? g : {};
  return {
    enabled: bool(g.enabled, true),
    size: num(g.size, 60),
    color: str(g.color, '#121428'),
    receiveShadow: bool(g.receiveShadow, true),
    grid: g.grid === false ? null : {
      size: num((g.grid || {}).size, 60),
      divisions: num((g.grid || {}).divisions, 60),
      color1: str((g.grid || {}).color1, '#2a3155'),
      color2: str((g.grid || {}).color2, '#1a1f38')
    }
  };
}

function normalizeEffects(e) {
  e = isObject(e) ? e : {};
  const bloom = e.bloom;
  return {
    bloom: isObject(bloom) || bloom === true ? {
      strength: num((bloom === true ? {} : bloom).strength, 0.6),
      radius: num((bloom === true ? {} : bloom).radius, 0.4),
      threshold: num((bloom === true ? {} : bloom).threshold, 0.85)
    } : null
  };
}

function normalizeOverlay(ov) {
  if (!isObject(ov)) return null;
  return {
    title: str(ov.title, ''),
    subtitle: str(ov.subtitle, ''),
    description: str(ov.description, ''),
    position: str(ov.position, 'bottom-left'), // bottom-left | center | top-left | bottom-center
    theme: str(ov.theme, 'light'), // light | dark
    accent: str(ov.accent, '#8a7dff'),
    links: Array.isArray(ov.links)
      ? ov.links.map((l) => ({ label: str(l.label, 'Link'), url: str(l.url, '#') }))
      : []
  };
}

export function normalizeConfig(raw) {
  const cfg = isObject(raw) ? raw : {};
  const scene = isObject(cfg.scene) ? cfg.scene : {};
  return {
    title: str(cfg.title, 'A Lumen3D site'),
    description: str(cfg.description, 'An interactive 3D website built with Lumen3D.'),
    threeVersion: str(cfg.threeVersion, THREE_VERSION),
    scene: {
      background: normalizeBackground(scene.background),
      fog: normalizeFog(scene.fog),
      environment: bool(scene.environment, true),
      shadows: bool(scene.shadows, true),
      exposure: num(scene.exposure, 1.0)
    },
    camera: normalizeCamera(cfg.camera),
    controls: normalizeControls(cfg.controls),
    lights: normalizeLights(cfg.lights),
    ground: normalizeGround(cfg.ground),
    objects: Array.isArray(cfg.objects) ? cfg.objects.map(normalizeObject) : [],
    effects: normalizeEffects(cfg.effects),
    overlay: normalizeOverlay(cfg.overlay)
  };
}

export { THREE_VERSION };
