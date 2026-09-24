// Premium scene templates — unlocked with a Pro license.
// These are polished, curated starting points (the free app can still build
// anything from a prompt; these are the "designed" showcase scenes).

export const PREMIUM_TEMPLATES = [
  {
    name: 'Aurora',
    config: {
      title: 'Aurora',
      scene: {
        background: { type: 'gradient', top: '#08213a', bottom: '#02040a' },
        fog: { color: '#02040a', near: 16, far: 70 },
        particles: { count: 1800, color: '#9ff4d0', size: 0.05, spread: 70 },
        environment: true, shadows: true
      },
      camera: { fov: 48, position: [0, 4, 12], lookAt: [0, 1.4, 0] },
      controls: { autoRotate: true, autoRotateSpeed: 0.35, enablePan: false, minDistance: 6, maxDistance: 26 },
      lights: [
        { type: 'hemisphere', skyColor: '#8ff0ff', groundColor: '#08213a', intensity: 0.5 },
        { type: 'directional', color: '#ffffff', intensity: 2.2, position: [6, 12, 6], castShadow: true },
        { type: 'point', color: '#4de1c1', intensity: 70, position: [-6, 5, -2] },
        { type: 'point', color: '#5a7dff', intensity: 60, position: [6, 3, 3] }
      ],
      ground: { enabled: true, color: '#061424', grid: { divisions: 70, color1: '#1c4a5e', color2: '#0a2233' } },
      objects: [
        { type: 'torusKnot', radius: 1.3, tube: 0.36, position: [0, 2.2, 0],
          material: { type: 'physical', color: '#4de1c1', metalness: 0.5, roughness: 0.1, clearcoat: 1, emissive: '#0c3a30', emissiveIntensity: 0.7 },
          animation: { type: 'rotate', axis: 'y', speed: 0.5 } },
        { type: 'icosahedron', radius: 0.5, detail: 1, position: [3, 1.4, 2],
          material: { type: 'standard', color: '#9ff4d0', emissive: '#9ff4d0', emissiveIntensity: 2.4, roughness: 0.4 },
          animation: { type: 'orbit', speed: 0.6, radius: 3.2, height: 0.5 } }
      ],
      effects: { bloom: { strength: 0.8, radius: 0.6, threshold: 0.7 } },
      overlay: { subtitle: 'Premium', title: 'Aurora', description: 'A cool, glowing showpiece with a starfield and dual rim lights.', position: 'bottom-left', accent: '#4de1c1' }
    }
  },
  {
    name: 'Molten',
    config: {
      title: 'Molten',
      scene: {
        background: { type: 'gradient', top: '#3a1108', bottom: '#0a0302' },
        fog: { color: '#0a0302', near: 14, far: 60 },
        environment: true, shadows: true
      },
      camera: { fov: 50, position: [4, 3, 8], lookAt: [0, 1.2, 0] },
      controls: { autoRotate: true, autoRotateSpeed: 0.5, enablePan: false, minDistance: 5, maxDistance: 22 },
      lights: [
        { type: 'hemisphere', skyColor: '#ffb08a', groundColor: '#2a0d05', intensity: 0.5 },
        { type: 'directional', color: '#ffffff', intensity: 2.0, position: [5, 10, 5], castShadow: true },
        { type: 'point', color: '#ff5c2a', intensity: 80, position: [-4, 3, -2] }
      ],
      ground: { enabled: true, color: '#180703', grid: { divisions: 50, color1: '#5e2114', color2: '#2a0d05' } },
      objects: [
        { type: 'dodecahedron', radius: 1.5, position: [0, 1.6, 0],
          material: { type: 'standard', color: '#ff5c2a', metalness: 0.3, roughness: 0.5, emissive: '#ff2a00', emissiveIntensity: 1.4 },
          animation: { type: 'float', speed: 0.9, amplitude: 0.3 } }
      ],
      effects: { bloom: { strength: 0.9, radius: 0.5, threshold: 0.6 } },
      overlay: { subtitle: 'Premium', title: 'Molten', description: 'A hot, emissive hero object with volcanic tones.', position: 'bottom-left', accent: '#ff5c2a' }
    }
  },
  {
    name: 'Showroom',
    config: {
      title: 'Showroom',
      scene: {
        background: { type: 'gradient', top: '#eef1f7', bottom: '#cdd4e2' },
        environment: true, shadows: true, exposure: 1.1
      },
      camera: { fov: 45, position: [4, 2.6, 7], lookAt: [0, 1, 0] },
      controls: { autoRotate: true, autoRotateSpeed: 0.4, enablePan: false, minDistance: 4, maxDistance: 16, maxPolarAngle: 1.5 },
      lights: [
        { type: 'hemisphere', skyColor: '#ffffff', groundColor: '#c8cede', intensity: 1.0 },
        { type: 'directional', color: '#ffffff', intensity: 2.6, position: [5, 10, 6], castShadow: true }
      ],
      ground: { enabled: true, color: '#dfe4ee', grid: false },
      objects: [
        { type: 'capsule', radius: 0.7, height: 1.4, position: [0, 1.1, 0],
          material: { type: 'physical', color: '#5a4dff', metalness: 0.9, roughness: 0.12, clearcoat: 1 },
          animation: { type: 'spin', axis: 'y', speed: 0.5 } }
      ],
      effects: {},
      overlay: { subtitle: 'Premium', title: 'Showroom', description: 'A clean, bright product-shot studio. Great for showcasing a single object.', position: 'bottom-left', theme: 'dark', accent: '#5a4dff' }
    }
  }
];
