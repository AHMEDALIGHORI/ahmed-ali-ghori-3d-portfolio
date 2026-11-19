import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const MODEL_URL = `${import.meta.env.BASE_URL}models/world.glb`;

const isCoarse = window.matchMedia('(hover: none)').matches;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Boots the WebGL layer: renderer, night lighting, the Blender-built glTF,
 * bloom, and adaptive quality. Returns the object the story layer drives.
 */
export function createWorld(canvas, { onProgress } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isCoarse,
    powerPreference: 'high-performance',
    alpha: false,
  });
  const maxDpr = () => Math.min(window.devicePixelRatio || 1, isCoarse ? 1.5 : 2);
  renderer.setPixelRatio(maxDpr());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060b);
  scene.fog = new THREE.FogExp2(0x060911, 0.0026);

  const camera = new THREE.PerspectiveCamera(
    48,
    window.innerWidth / Math.max(1, window.innerHeight),
    0.1,
    3200,
  );
  camera.position.set(58, 44, 92);

  // ---------------------------------------------------------------- lights
  const hemi = new THREE.HemisphereLight(0x35507f, 0x0a0e16, 1.05);
  const moon = new THREE.DirectionalLight(0xb4cfff, 1.5);
  moon.position.set(60, 90, 40);

  const studioLight = new THREE.PointLight(0xffb070, 26, 24, 2);
  studioLight.position.set(9, 2.6, -7.4);

  const deskLight = new THREE.PointLight(0x7fd4ff, 16, 12, 2);
  deskLight.position.set(9, 1.5, -8.2);

  const panelLight = new THREE.PointLight(0x8fe9ff, 26, 30, 2);
  panelLight.position.set(-8, 6.4, -6);

  const cityGlow = new THREE.PointLight(0xff9a5c, 55, 220, 2);
  cityGlow.position.set(0, -34, 0);

  // washes the portrait standee on the deck
  const portraitLight = new THREE.PointLight(0xffd0a0, 10, 9, 2);
  portraitLight.position.set(2.6, 3.2, 10.1);

  // follows the pointer across the deck so the world answers the hand
  const cursorLight = new THREE.PointLight(0x9fe6ff, 0, 16, 2);
  cursorLight.position.set(0, 3, 0);

  scene.add(hemi, moon, studioLight, deskLight, panelLight, cityGlow, portraitLight, cursorLight);

  // ------------------------------------------------------------ composer
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    isCoarse ? 0.3 : 0.42,
    0.5,
    0.88,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ----------------------------------------------------------------- glTF
  const nodes = new Map();
  const panels = [[], [], [], []]; // cloned materials per panel, for hover
  const panelMeshes = [];
  let model = null;
  let emissiveMaterials = [];

  const loader = new GLTFLoader();

  const ready = new Promise((resolve, reject) => {
    loader.load(
      MODEL_URL,
      (gltf) => {
        model = gltf.scene;
        model.traverse((child) => {
          // record every named node — the path, look and panel anchors are
          // empties, not meshes, and the story layer needs them
          if (child.name) nodes.set(child.name, child);
          if (!child.isMesh) return;
          child.castShadow = false;
          child.receiveShadow = false;

          const materials = Array.isArray(child.material) ? child.material : [child.material];
          const cloned = materials.map((mat) => {
            if (!mat) return mat;
            const copy = mat.clone();
            copy.envMapIntensity = 0.7;
            if (copy.map) {
              copy.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
              copy.map.needsUpdate = true;
            }
            if (copy.emissive && (copy.emissiveMap || copy.emissive.getHex() !== 0)) {
              copy.userData.baseEmissive = copy.emissiveIntensity ?? 1;
              emissiveMaterials.push(copy);
            }
            return copy;
          });

          child.material = Array.isArray(child.material) ? cloned : cloned[0];

          const match = /^Panel(\d)_/.exec(child.name);
          if (match) {
            const index = Number(match[1]) - 1;
            panelMeshes.push(child);
            panels[index]?.push(...cloned.filter((m) => m && m.emissive));
          }

          if (child.name) nodes.set(child.name, child);
        });

        scene.add(model);
        resolve(nodes);
      },
      (event) => {
        if (onProgress && event.total) onProgress(Math.min(1, event.loaded / event.total));
      },
      (error) => reject(error),
    );
  });

  // ----------------------------------------------------------- light modes
  const MODES = {
    night: {
      hemi: [0x35507f, 0x0a0e16, 1.05],
      moon: [0xb4cfff, 1.5],
      fog: [0x060911, 0.0026],
      background: 0x05060b,
      exposure: 1.05,
      bloom: isCoarse ? 0.3 : 0.42,
      emissive: 1,
      studio: 26,
    },
    dusk: {
      hemi: [0x6d7bb5, 0x1b1410, 1.35],
      moon: [0xffb27a, 1.9],
      fog: [0x171327, 0.0022],
      background: 0x121226,
      exposure: 1.1,
      bloom: isCoarse ? 0.2 : 0.28,
      emissive: 0.45,
      studio: 16,
    },
  };

  let mode = 'night';

  function setMode(next) {
    const preset = MODES[next] || MODES.night;
    mode = MODES[next] ? next : 'night';

    hemi.color.setHex(preset.hemi[0]);
    hemi.groundColor.setHex(preset.hemi[1]);
    hemi.intensity = preset.hemi[2];
    moon.color.setHex(preset.moon[0]);
    moon.intensity = preset.moon[1];
    scene.fog.color.setHex(preset.fog[0]);
    scene.fog.density = preset.fog[1];
    scene.background.setHex(preset.background);
    renderer.toneMappingExposure = preset.exposure;
    bloom.strength = preset.bloom;
    studioLight.intensity = preset.studio;

    for (const mat of emissiveMaterials) {
      mat.emissiveIntensity = (mat.userData.baseEmissive ?? 1) * preset.emissive;
    }
    return mode;
  }

  // ------------------------------------------------------- adaptive quality
  let frames = 0;
  let slowTime = 0;
  let degraded = false;
  let last = performance.now();

  function tickQuality(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (degraded || dt <= 0) return;
    if (dt > 1 / 45) slowTime += dt;
    else slowTime = Math.max(0, slowTime - dt * 0.5);
    frames += 1;
    if (frames > 90 && slowTime > 2.5) {
      degraded = true;
      bloom.enabled = false;
      renderer.setPixelRatio(1);
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  // ------------------------------------------------------------- resizing
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(degraded ? 1 : maxDpr());
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));

  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent('world:lost'));
    },
    false,
  );

  // ------------------------------------------------------- cursor position
  const raycastPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.2);
  const raycaster = new THREE.Raycaster();
  const hitPoint = new THREE.Vector3();
  const pointerNdc = new THREE.Vector2(0, 0);

  function setCursor(x, y) {
    pointerNdc.set(x, y);
    raycaster.setFromCamera(pointerNdc, camera);
    if (raycaster.ray.intersectPlane(raycastPlane, hitPoint)) {
      cursorLight.position.copy(hitPoint);
      cursorLight.intensity = 12;
    } else {
      cursorLight.intensity = 0;
    }
  }

  function render() {
    composer.render();
  }

  // the agent core: a slow bob + counter-rotating rings, authored in Blender
  const agentCore = nodes.get('AgentCore');
  const agentRingA = nodes.get('AgentRingA');
  const agentRingB = nodes.get('AgentRingB');
  const coreBaseY = agentCore ? agentCore.position.y : 0;

  function animateAgent(t) {
    if (agentCore) {
      agentCore.position.y = coreBaseY + Math.sin(t * 1.5) * 0.05;
      agentCore.rotation.y = t * 0.35;
    }
    if (agentRingA) agentRingA.rotation.z = t * 0.8;
    if (agentRingB) agentRingB.rotation.x = -t * 0.55;
  }

  return {
    scene,
    camera,
    renderer,
    composer,
    nodes,
    panels,
    panelMeshes,
    ready,
    render,
    resize,
    bloom,
    setMode,
    animateAgent,
    getMode: () => mode,
    setCursor,
    tickQuality,
    isDegraded: () => degraded,
    getModel: () => model,
    prefersReduced,
    isCoarse,
  };
}
