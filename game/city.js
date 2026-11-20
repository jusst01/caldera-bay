// CALDERA BAY — city.js
// v2 art city, sky, light rig, seeded world build, facades, palms, lamps, volcano, colliders.
import * as THREE from '../three.module.min.js';

export const DISTRICTS = [
  { id: 'muelle', name: 'Muelle Viejo', center: [-300, 300] },
  { id: 'paseo', name: 'Paseo Dorado', center: [330, 60] },
  { id: 'verde', name: 'Alto Verde', center: [300, -300] },
  { id: 'ceniza', name: 'Distrito Ceniza', center: [-300, -300] },
  { id: 'cumbre', name: 'La Cumbre', center: [0, -500] }
];

export function districtAt(x, z) {
  let closest = DISTRICTS[0];
  let minDist = Infinity;
  for (const d of DISTRICTS) {
    const dx = x - d.center[0];
    const dz = z - d.center[1];
    const dist = dx * dx + dz * dz;
    if (dist < minDist) {
      minDist = dist;
      closest = d;
    }
  }
  return closest.id;
}

export function groundHeight(x, z) {
  let h = 0;
  // Alto Verde rise (NE hills)
  if (x > 100 && z < 0) {
    const dx = x - 300;
    const dz = z - (-300);
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 400) {
      h += Math.max(0, (1 - dist / 400) * 45);
    }
  }
  // La Cumbre ridge (N ridge)
  if (z < -350) {
    const dz = z - (-500);
    const dist = Math.abs(dz);
    if (dist < 250) {
      h += Math.max(0, (1 - dist / 250) * 80);
    }
  }
  return h;
}

const buildingColliders = [];

export function collideCircle(x, z, radius) {
  for (const b of buildingColliders) {
    const closestX = Math.max(b.minX, Math.min(x, b.maxX));
    const closestZ = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - closestX;
    const dz = z - closestZ;
    if ((dx * dx + dz * dz) < (radius * radius)) {
      return true;
    }
  }
  return false;
}

export function eject(x, z, radius) {
  let cx = x;
  let cz = z;
  for (let iter = 0; iter < 3; iter++) {
    for (const b of buildingColliders) {
      const closestX = Math.max(b.minX, Math.min(cx, b.maxX));
      const closestZ = Math.max(b.minZ, Math.min(cz, b.maxZ));
      const dx = cx - closestX;
      const dz = cz - closestZ;
      const distSq = dx * dx + dz * dz;
      const minDist = radius + 0.5;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = minDist - dist;
        cx += (dx / dist) * overlap;
        cz += (dz / dist) * overlap;
      }
    }
  }
  return { x: cx, z: cz };
}

let sunLight = null;
let sceneRef = null;
let duskActive = false;

export function setFinaleDusk(on) {
  duskActive = on;
  if (!sunLight || !sceneRef) return;
  if (on) {
    sunLight.color.setHex(0xFF8A5C);
    sunLight.intensity = 1.2 * 1.4 * 2.3;
    if (sceneRef.fog) {
      sceneRef.fog.color.setHex(0xB36A6E);
      sceneRef.fog.density = 0.0028 * 1.4;
    }
  } else {
    sunLight.color.setHex(0xFFB066);
    sunLight.intensity = 2.3;
    if (sceneRef.fog) {
      sceneRef.fog.color.setHex(0xD97A44);
      sceneRef.fog.density = 0.0020;
    }
  }
}

export function updateLightRig(px, pz) {
  if (!sunLight) return;
  sunLight.position.set(px - 120, 95, pz + 260);
  sunLight.target.position.set(px, 0, pz);
  sunLight.target.updateMatrixWorld();
}

function createFacadeTextures() {
  const families = [];
  for (let i = 0; i < 4; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const emissiveCanvas = document.createElement('canvas');
    emissiveCanvas.width = 256;
    emissiveCanvas.height = 256;
    const eCtx = emissiveCanvas.getContext('2d');
    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 256, 256);

    if (i === 0) { // F1 stucco shop
      ctx.fillStyle = '#F5E3C3';
      ctx.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          const wx = 32 + c * 52;
          const wy = 32 + r * 64;
          ctx.fillStyle = '#1F6E73';
          ctx.fillRect(wx, wy, 36, 44);
          if ((r * 4 + c) % 2 === 0) {
            eCtx.fillStyle = '#FFC46B';
            eCtx.fillRect(wx + 4, wy + 4, 28, 36);
          }
        }
      }
      ctx.fillStyle = '#FF7E5F';
      ctx.fillRect(0, 200, 256, 30);
    } else if (i === 1) { // F2 concrete block
      ctx.fillStyle = '#7C8894';
      ctx.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 6; c++) {
          const wx = 16 + c * 40;
          const wy = 12 + r * 30;
          ctx.fillStyle = '#3A4450';
          ctx.fillRect(wx, wy, 24, 20);
          if ((r + c) % 3 === 0) {
            eCtx.fillStyle = '#BFE3FF';
            eCtx.fillRect(wx + 3, wy + 3, 18, 14);
          }
        }
      }
    } else if (i === 2) { // F3 warehouse
      ctx.fillStyle = '#B4552D';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#8A4A2B';
      for (let x = 0; x < 256; x += 16) {
        ctx.fillRect(x, 0, 8, 256);
      }
      ctx.fillStyle = '#2A2A30';
      ctx.fillRect(80, 120, 96, 136);
      eCtx.fillStyle = '#FFE9B0';
      eCtx.fillRect(90, 40, 20, 20);
      eCtx.fillRect(140, 40, 20, 20);
    } else { // F4 villa
      ctx.fillStyle = '#F2EFE6';
      ctx.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          const wx = 48 + c * 96;
          const wy = 48 + r * 100;
          ctx.fillStyle = '#4C8A57';
          ctx.fillRect(wx, wy, 64, 80);
          eCtx.fillStyle = '#FFC46B';
          eCtx.fillRect(wx + 8, wy + 8, 48, 64);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const eTex = new THREE.CanvasTexture(emissiveCanvas);
    eTex.colorSpace = THREE.SRGBColorSpace;
    families.push({ map: tex, emissiveMap: eTex });
  }
  return families;
}

function createGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#7A5F42';
  ctx.fillRect(0, 0, 1024, 1024);

  // Noise blotches (sand)
  ctx.fillStyle = '#6E533A';
  for (let i = 0; i < 400; i++) {
    const rx = (i * 73) % 1024;
    const ry = (i * 137) % 1024;
    ctx.beginPath();
    ctx.arc(rx, ry, 30 + (i % 20), 0, Math.PI * 2);
    ctx.fill();
  }

  // Asphalt strips
  ctx.fillStyle = '#2C2A27';
  const scale = 1024 / 1152;
  const gridSpacing = 64 * scale;
  const stripWidth = 15 * scale;

  for (let pos = 0; pos <= 1024; pos += gridSpacing) {
    ctx.fillRect(pos - stripWidth / 2, 0, stripWidth, 1024);
    ctx.fillRect(0, pos - stripWidth / 2, 1024, stripWidth);
  }

  // Sidewalk edges
  ctx.strokeStyle = '#8A7A64';
  ctx.lineWidth = 1.2 * scale; // per recipe: 1.2m
  for (let pos = 0; pos <= 1024; pos += gridSpacing) {
    ctx.strokeRect(pos - stripWidth / 2 - 1, 0, 2, 1024);
    ctx.strokeRect(0, pos - stripWidth / 2 - 1, 1024, 2);
  }

  // Boulevard dashes
  ctx.strokeStyle = '#E8D9A0';
  ctx.lineWidth = 4 * scale;
  ctx.setLineDash([20 * scale, 20 * scale]);
  const x256 = (256 + 576) * scale;
  ctx.beginPath();
  ctx.moveTo(x256, 0);
  ctx.lineTo(x256, 1024);
  ctx.stroke();

  const z64 = (64 + 576) * scale;
  ctx.beginPath();
  ctx.moveTo(0, z64);
  ctx.lineTo(1024, z64);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 220, 150, 1)');
  grad.addColorStop(0.4, 'rgba(255, 160, 80, 0.5)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export function buildCity(scene, renderer, rng) {
  sceneRef = scene;

  // Sky dome
  const skyGeo = new THREE.SphereGeometry(1600, 32, 15);
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512;
  skyCanvas.height = 512;
  const sCtx = skyCanvas.getContext('2d');
  const grad = sCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#232C4E');
  grad.addColorStop(0.45, '#6E4468');
  grad.addColorStop(0.68, '#C65D4E');
  grad.addColorStop(0.85, '#FF8C42');
  grad.addColorStop(1, '#FFC46B');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 512, 512);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // Sun & glare sprites
  const sunDir = new THREE.Vector3(-0.5, 0.25, -0.85).normalize();
  const sunPos = sunDir.clone().multiplyScalar(1500);
  const sunGeo = new THREE.SphereGeometry(60, 16, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFE8C0, fog: false });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.position.copy(sunPos);
  scene.add(sunMesh);

  const glowTex = createGlowTexture();
  const glareMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xFFB066, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const glareSprite = new THREE.Sprite(glareMat);
  glareSprite.scale.set(520, 520, 1);
  glareSprite.position.copy(sunPos);
  scene.add(glareSprite);

  // Cloud sprites
  const cloudMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xFF9A6A, transparent: true, opacity: 0.45, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const cs = new THREE.Sprite(cloudMat);
    const angle = (i / 6) * Math.PI * 2;
    const dist = 700 + rng() * 400;
    cs.position.set(Math.cos(angle) * dist, 140 + rng() * 100, Math.sin(angle) * dist);
    cs.scale.set(300 + rng() * 150, 150 + rng() * 80, 1);
    scene.add(cs);
  }

  // Light rig
  sunLight = new THREE.DirectionalLight(0xFFB066, 2.3);
  sunLight.position.set(-120, 95, 260);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 600;
  const dBox = 130;
  sunLight.shadow.camera.left = -dBox;
  sunLight.shadow.camera.right = dBox;
  sunLight.shadow.camera.top = dBox;
  sunLight.shadow.camera.bottom = -dBox;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.03;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const hemiLight = new THREE.HemisphereLight(0x8A63B8, 0x40302A, 0.5);
  scene.add(hemiLight);

  const ambLight = new THREE.AmbientLight(0x403050, 0.35);
  scene.add(ambLight);

  scene.fog = new THREE.FogExp2(0xD97A44, 0.0020);

  // Ground plane
  const groundTex = createGroundTexture();
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.8, metalness: 0.1, envMapIntensity: 0.25 });
  const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500, 32, 32), groundMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.receiveShadow = true;
  scene.add(groundPlane);

  // Facades & Buildings
  const facadeTextures = createFacadeTextures();
  const facadeMats = [
    new THREE.MeshStandardMaterial({ map: facadeTextures[0].map, emissiveMap: facadeTextures[0].emissiveMap, emissive: 0xFFB066, emissiveIntensity: 1.0, roughness: 0.7, envMapIntensity: 0.25 }),
    new THREE.MeshStandardMaterial({ map: facadeTextures[1].map, emissiveMap: facadeTextures[1].emissiveMap, emissive: 0xFFB066, emissiveIntensity: 1.0, roughness: 0.7, envMapIntensity: 0.25 }),
    new THREE.MeshStandardMaterial({ map: facadeTextures[2].map, emissiveMap: facadeTextures[2].emissiveMap, emissive: 0xFFB066, emissiveIntensity: 1.0, roughness: 0.7, envMapIntensity: 0.25 }),
    new THREE.MeshStandardMaterial({ map: facadeTextures[3].map, emissiveMap: facadeTextures[3].emissiveMap, emissive: 0xFFB066, emissiveIntensity: 1.0, roughness: 0.7, envMapIntensity: 0.25 }),
  ];

  const buildingBoxGeo = new THREE.BoxGeometry(36, 32, 36);
  const matrices = [[], [], [], []];

  for (let gx = -9; gx <= 9; gx++) {
    for (let gz = -9; gz <= 9; gz++) {
      if (gx === 0 || gz === 0) continue;
      const bx = gx * 64;
      const bz = gz * 64;
      const family = Math.floor(rng() * 4);
      const h = 18 + rng() * 30;
      const w = 32 + rng() * 8;
      const d = 32 + rng() * 8;

      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3(bx, h / 2 + groundHeight(bx, bz), bz);
      const rot = new THREE.Matrix4().makeRotationY(Math.floor(rng() * 4) * (Math.PI / 2));
      const scale = new THREE.Vector3(w / 36, h / 32, d / 36);
      matrix.compose(pos, new THREE.Quaternion().setFromRotationMatrix(rot), scale);

      if (matrices[family].length < 220) {
        matrices[family].push(matrix);
      }

      buildingColliders.push({
        minX: bx - w / 2,
        maxX: bx + w / 2,
        minZ: bz - d / 2,
        maxZ: bz + d / 2
      });
    }
  }

  for (let i = 0; i < 4; i++) {
    if (matrices[i].length > 0) {
      const im = new THREE.InstancedMesh(buildingBoxGeo, facadeMats[i], matrices[i].length);
      for (let m = 0; m < matrices[i].length; m++) {
        im.setMatrixAt(m, matrices[i][m]);
      }
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = true;
      im.receiveShadow = true;
      scene.add(im);
    }
  }

  // Palms (~300)
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 5.2, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6B5A44, roughness: 0.9 });
  const palmCount = 300;
  const palmIm = new THREE.InstancedMesh(trunkGeo, trunkMat, palmCount);
  let pIdx = 0;
  for (let gx = -8; gx <= 8; gx += 2) {
    for (let gz = -8; gz <= 8; gz += 2) {
      if (pIdx >= palmCount) break;
      const px = gx * 64 + 22 + (rng() - 0.5) * 4;
      const pz = gz * 64 + 22 + (rng() - 0.5) * 4;
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3(px, 2.6 + groundHeight(px, pz), pz);
      matrix.makeTranslation(pos.x, pos.y, pos.z);
      palmIm.setMatrixAt(pIdx++, matrix);
    }
  }
  palmIm.instanceMatrix.needsUpdate = true;
  palmIm.castShadow = true;
  scene.add(palmIm);

  // Street lamps along boulevards
  const lampGeo = new THREE.CylinderGeometry(0.12, 0.15, 5.6, 6);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2A2A30, roughness: 0.5 });
  const lampIm = new THREE.InstancedMesh(lampGeo, lampMat, 120);
  let lIdx = 0;
  for (let gz = -500; gz <= 500; gz += 36) {
    if (lIdx >= 120) break;
    const lx = 256 + 12;
    const lz = gz;
    const mat = new THREE.Matrix4();
    mat.makeTranslation(lx, 2.8 + groundHeight(lx, lz), lz);
    lampIm.setMatrixAt(lIdx++, mat);
  }
  lampIm.instanceMatrix.needsUpdate = true;
  scene.add(lampIm);

  // Caldera Volcano at north edge
  const volcanoGeo = new THREE.ConeGeometry(220, 220, 16);
  const volcanoMat = new THREE.MeshStandardMaterial({ color: 0x37303E, roughness: 0.9 });
  const volcano = new THREE.Mesh(volcanoGeo, volcanoMat);
  volcano.position.set(0, 110 + groundHeight(0, -540), -540);
  scene.add(volcano);

  const craterGeo = new THREE.CircleGeometry(35, 12);
  const craterMat = new THREE.MeshBasicMaterial({ color: 0xFF6A1A, fog: false });
  const crater = new THREE.Mesh(craterGeo, craterMat);
  crater.rotation.x = -Math.PI / 2;
  crater.position.set(0, 221 + groundHeight(0, -540), -540);
  scene.add(crater);

  const craterGlow = new THREE.Sprite(glareMat);
  craterGlow.scale.set(90, 90, 1);
  craterGlow.position.set(0, 225 + groundHeight(0, -540), -540);
  scene.add(craterGlow);

  // 3 Smoke sprites above volcano
  const smokeMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xD88A6A, transparent: true, opacity: 0.35, depthWrite: false });
  for (let s = 0; s < 3; s++) {
    const smoke = new THREE.Sprite(smokeMat);
    smoke.scale.set(120, 120, 1);
    smoke.position.set(s * 20 - 20, 270 + s * 40 + groundHeight(0, -540), -540 + s * 10);
    scene.add(smoke);
  }
}
