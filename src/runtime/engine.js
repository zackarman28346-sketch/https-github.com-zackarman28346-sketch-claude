// Lumen3D runtime engine.
// Loaded in the generated site. Fetches ./config.json and turns the
// declarative scene description into a live Three.js render loop.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const AXES = { x: 'x', y: 'y', z: 'z' };

function gradientTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildGeometry(o) {
  switch (o.type) {
    case 'sphere':
      return new THREE.SphereGeometry(o.radius, o.segments, Math.max(8, o.segments / 2));
    case 'plane':
      return new THREE.PlaneGeometry(o.size[0], o.size[1]);
    case 'cylinder':
      return new THREE.CylinderGeometry(o.radius, o.radius, o.height, o.segments);
    case 'cone':
      return new THREE.ConeGeometry(o.radius, o.height, o.segments);
    case 'torus':
      return new THREE.TorusGeometry(o.radius, o.tube, 24, o.segments);
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(o.radius, o.tube, Math.max(64, o.segments * 2), 16);
    case 'ring':
      return new THREE.RingGeometry(Math.max(0.01, o.radius - o.tube), o.radius, o.segments);
    case 'capsule':
      return new THREE.CapsuleGeometry(o.radius, o.height, 12, o.segments);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(o.radius, o.detail);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(o.radius, o.detail);
    case 'box':
    default:
      return new THREE.BoxGeometry(o.size[0], o.size[1], o.size[2]);
  }
}

function buildMaterial(m) {
  const common = {
    color: new THREE.Color(m.color),
    wireframe: m.wireframe,
    transparent: m.transparent,
    opacity: m.opacity,
    flatShading: m.flatShading
  };
  switch (m.type) {
    case 'basic':
      return new THREE.MeshBasicMaterial({
        color: common.color,
        wireframe: m.wireframe,
        transparent: m.transparent,
        opacity: m.opacity
      });
    case 'normal':
      return new THREE.MeshNormalMaterial({ wireframe: m.wireframe, flatShading: m.flatShading });
    case 'physical':
      return new THREE.MeshPhysicalMaterial({
        ...common,
        metalness: m.metalness,
        roughness: m.roughness,
        emissive: new THREE.Color(m.emissive),
        emissiveIntensity: m.emissiveIntensity,
        clearcoat: m.clearcoat,
        transmission: m.transmission,
        ior: m.ior
      });
    case 'standard':
    default:
      return new THREE.MeshStandardMaterial({
        ...common,
        metalness: m.metalness,
        roughness: m.roughness,
        emissive: new THREE.Color(m.emissive),
        emissiveIntensity: m.emissiveIntensity
      });
  }
}

function buildParticles(p) {
  const positions = new Float32Array(p.count * 3);
  const half = p.spread / 2;
  for (let i = 0; i < p.count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * p.spread;
    positions[i * 3 + 1] = Math.random() * half + 1; // keep them above the floor
    positions[i * 3 + 2] = (Math.random() - 0.5) * p.spread;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: new THREE.Color(p.color),
    size: p.size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  return new THREE.Points(geo, mat);
}

function buildLight(l) {
  let light;
  switch (l.type) {
    case 'ambient':
      light = new THREE.AmbientLight(l.color, l.intensity);
      break;
    case 'hemisphere':
      light = new THREE.HemisphereLight(l.skyColor, l.groundColor, l.intensity);
      light.position.set(...l.position);
      break;
    case 'point':
      light = new THREE.PointLight(l.color, l.intensity, l.distance);
      light.position.set(...l.position);
      light.castShadow = l.castShadow;
      break;
    case 'spot':
      light = new THREE.SpotLight(l.color, l.intensity, l.distance, l.angle, l.penumbra);
      light.position.set(...l.position);
      light.castShadow = l.castShadow;
      break;
    case 'directional':
    default:
      light = new THREE.DirectionalLight(l.color, l.intensity);
      light.position.set(...l.position);
      light.castShadow = l.castShadow;
      if (light.castShadow) {
        light.shadow.mapSize.set(2048, 2048);
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 80;
        const d = 25;
        light.shadow.camera.left = -d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = -d;
        light.shadow.bias = -0.0005;
      }
      break;
  }
  return light;
}

function animate(mesh, anim, t, base) {
  const axis = AXES[anim.axis] || 'y';
  switch (anim.type) {
    case 'rotate':
    case 'spin':
      mesh.rotation[axis] = base.rotation[axis] + t * anim.speed;
      break;
    case 'float':
      mesh.position.y = base.position.y + Math.sin(t * anim.speed) * anim.amplitude;
      mesh.rotation.y = base.rotation.y + t * anim.speed * 0.3;
      break;
    case 'orbit': {
      const a = t * anim.speed;
      mesh.position.x = base.position.x + Math.cos(a) * anim.radius;
      mesh.position.z = base.position.z + Math.sin(a) * anim.radius;
      mesh.position.y = base.position.y + anim.height;
      mesh.rotation.y = base.rotation.y + a;
      break;
    }
    default:
      break;
  }
}

function sizeOf(container) {
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  return { w, h };
}

// Build a live Three.js scene from an already-normalized config object into
// `container`. Returns a handle with dispose() so the scene can be torn down
// and replaced (used by the live preview in the desktop app).
export async function mount(cfg, container = document.body) {
  let { w, h } = sizeOf(container);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cfg.scene.exposure;
  if (cfg.scene.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  renderer.domElement.id = 'lumen-canvas';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  // Background
  const bg = cfg.scene.background;
  if (bg.type === 'gradient') {
    scene.background = gradientTexture(bg.top, bg.bottom);
  } else {
    scene.background = new THREE.Color(bg.color);
  }

  // Fog
  if (cfg.scene.fog) {
    scene.fog = cfg.scene.fog.type === 'exp2'
      ? new THREE.FogExp2(cfg.scene.fog.color, cfg.scene.fog.density)
      : new THREE.Fog(cfg.scene.fog.color, cfg.scene.fog.near, cfg.scene.fog.far);
  }

  // Particles (starfield)
  let particles = null;
  if (cfg.scene.particles) {
    particles = buildParticles(cfg.scene.particles);
    scene.add(particles);
  }

  // Environment (image-based lighting for PBR reflections)
  if (cfg.scene.environment) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  }

  // Camera
  const camera = new THREE.PerspectiveCamera(
    cfg.camera.fov,
    w / h,
    cfg.camera.near,
    cfg.camera.far
  );
  camera.position.set(...cfg.camera.position);
  camera.lookAt(...cfg.camera.lookAt);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  const c = cfg.controls;
  controls.enabled = c.enabled;
  controls.enableDamping = c.enableDamping;
  controls.dampingFactor = c.dampingFactor;
  controls.autoRotate = c.autoRotate;
  controls.autoRotateSpeed = c.autoRotateSpeed;
  controls.enableZoom = c.enableZoom;
  controls.enablePan = c.enablePan;
  controls.minDistance = c.minDistance;
  controls.maxDistance = c.maxDistance;
  controls.minPolarAngle = c.minPolarAngle;
  controls.maxPolarAngle = c.maxPolarAngle;
  controls.target.set(...cfg.camera.lookAt);

  // Lights
  for (const l of cfg.lights) scene.add(buildLight(l));

  // Ground
  if (cfg.ground.enabled) {
    const groundMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.ground.color),
      roughness: 0.95,
      metalness: 0
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(cfg.ground.size, cfg.ground.size), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = cfg.ground.receiveShadow;
    scene.add(ground);
    if (cfg.ground.grid) {
      const grid = new THREE.GridHelper(
        cfg.ground.grid.size,
        cfg.ground.grid.divisions,
        new THREE.Color(cfg.ground.grid.color1),
        new THREE.Color(cfg.ground.grid.color2)
      );
      grid.position.y = 0.001;
      scene.add(grid);
    }
  }

  // Objects
  const animated = [];
  const loader = new GLTFLoader();
  for (const o of cfg.objects) {
    if (o.type === 'model' && o.src) {
      try {
        const gltf = await loader.loadAsync(o.src);
        const root = gltf.scene;
        root.position.set(...o.position);
        root.rotation.set(...o.rotation);
        root.scale.set(...o.scale);
        root.traverse((n) => {
          if (n.isMesh) {
            n.castShadow = o.castShadow;
            n.receiveShadow = o.receiveShadow;
          }
        });
        scene.add(root);
        if (o.animation) {
          animated.push({ mesh: root, anim: o.animation, base: captureBase(root) });
        }
      } catch (err) {
        console.warn('[lumen3d] failed to load model', o.src, err);
      }
      continue;
    }

    const mesh = new THREE.Mesh(buildGeometry(o), buildMaterial(o.material));
    mesh.position.set(...o.position);
    mesh.rotation.set(...o.rotation);
    mesh.scale.set(...o.scale);
    mesh.castShadow = o.castShadow;
    mesh.receiveShadow = o.receiveShadow;
    scene.add(mesh);
    if (o.animation) {
      animated.push({ mesh, anim: o.animation, base: captureBase(mesh) });
    }
  }

  // Post-processing
  let composer = null;
  if (cfg.effects.bloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const b = cfg.effects.bloom;
    composer.addPass(new UnrealBloomPass(
      new THREE.Vector2(w, h),
      b.strength,
      b.radius,
      b.threshold
    ));
  }

  // Overlay
  let overlayEl = null;
  if (cfg.overlay) overlayEl = renderOverlay(cfg.overlay, container);

  // Resize — track the container's box, not just the window.
  function onResize() {
    const s = sizeOf(container);
    w = s.w; h = s.h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
  if (ro) ro.observe(container);

  // Render loop
  let running = true;
  const clock = new THREE.Clock();
  function tick() {
    if (!running) return;
    const t = clock.getElapsedTime();
    for (const a of animated) animate(a.mesh, a.anim, t, a.base);
    if (particles) particles.rotation.y = t * 0.02;
    controls.update();
    if (composer) composer.render();
    else renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  function dispose() {
    running = false;
    window.removeEventListener('resize', onResize);
    if (ro) ro.disconnect();
    if (overlayEl) overlayEl.remove();
    renderer.dispose();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }

  return { scene, camera, renderer, controls, dispose };
}

// Load a normalized config.json from a URL and mount it full-window.
// Used by the generated static site.
export async function boot(configUrl = './config.json') {
  const cfg = await fetch(configUrl).then((r) => r.json());
  const container = document.getElementById('lumen-root') || document.body;
  return mount(cfg, container);
}

function captureBase(obj) {
  return {
    position: obj.position.clone(),
    rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z }
  };
}

function renderOverlay(ov, container) {
  const el = document.createElement('div');
  el.className = `lumen-overlay lumen-${ov.position} lumen-theme-${ov.theme}`;
  el.style.setProperty('--lumen-accent', ov.accent);

  const parts = [];
  if (ov.subtitle) parts.push(`<p class="lumen-eyebrow">${escapeHtml(ov.subtitle)}</p>`);
  if (ov.title) parts.push(`<h1 class="lumen-title">${escapeHtml(ov.title)}</h1>`);
  if (ov.description) parts.push(`<p class="lumen-desc">${escapeHtml(ov.description)}</p>`);
  if (ov.links.length) {
    const links = ov.links
      .map((l) => `<a href="${escapeAttr(l.url)}" class="lumen-link">${escapeHtml(l.label)}</a>`)
      .join('');
    parts.push(`<div class="lumen-links">${links}</div>`);
  }
  el.innerHTML = parts.join('');
  container.appendChild(el);
  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function escapeAttr(s) {
  return escapeHtml(s);
}
