import * as THREE from 'three';

export function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const DISTRICTS = [
  { id: 'muelle', name: 'Muelle Viejo', center: [-300, 300], colors: [0xB4552D, 0xD9A05B, 0xC8402F, 0x1F6E73] },
  { id: 'paseo', name: 'Paseo Dorado', center: [330, 60], colors: [0xFF7E5F, 0xF2B441, 0xF5E3C3, 0x3E7C4F, 0xFF5E8A] },
  { id: 'verde', name: 'Alto Verde', center: [300, -300], colors: [0xF2EFE6, 0x4C8A57, 0xC96F3B] },
  { id: 'ceniza', name: 'Distrito Ceniza', center: [-300, -300], colors: [0x5A5A60, 0x7C8894, 0xE8A33D, 0xFF8C42] },
  { id: 'cumbre', name: 'La Cumbre', center: [0, -500], colors: [0x3E3A45, 0x6B4E71, 0xFF3B30] }
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

export function createCity(scene, seed = 77) {
  const rng = mulberry32(seed);
  const colliders = [];

  // Ground
  const groundGeo = new THREE.PlaneGeometry(1500, 1500, 32, 32);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x4A4640, roughness: 0.9, flatShading: true });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads grid: 18x18 blocks of 64m = 1152m square
  const blockSize = 64;
  const gridCount = 18;
  const halfSize = (gridCount * blockSize) / 2;

  // Road lines
  const roadMat = new THREE.MeshBasicMaterial({ color: 0x2A2825 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xE8D9A0 });

  // Procedural Canvas Facades (4 families, 256x256)
  const facadeTextures = [];
  for (let i = 0; i < 4; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (i === 0) { // Stucco shop
      ctx.fillStyle = '#F5E3C3';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#1F6E73';
      for (let y = 20; y < 240; y += 50) {
        for (let x = 20; x < 240; x += 40) {
          ctx.fillRect(x, y, 28, 36);
        }
      }
    } else if (i === 1) { // Concrete block
      ctx.fillStyle = '#7C8894';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#3A424A';
      for (let y = 15; y < 240; y += 30) {
        for (let x = 15; x < 240; x += 35) {
          ctx.fillRect(x, y, 25, 20);
        }
      }
    } else if (i === 2) { // Warehouse corrugation
      ctx.fillStyle = '#5A5A60';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#3A3A40';
      for (let x = 0; x < 256; x += 12) {
        ctx.fillRect(x, 0, 6, 256);
      }
      ctx.fillStyle = '#8A4A2B';
      ctx.fillRect(40, 100, 80, 120);
    } else { // Villa white
      ctx.fillStyle = '#F2EFE6';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#C96F3B';
      ctx.fillRect(0, 0, 256, 25);
      ctx.fillStyle = '#4C8A57';
      for (let y = 50; y < 240; y += 70) {
        for (let x = 30; x < 220; x += 70) {
          ctx.beginPath();
          ctx.arc(x + 20, y + 20, 20, Math.PI, 0, false);
          ctx.fill();
          ctx.fillRect(x, y + 20, 40, 40);
        }
      }
    }
    facadeTextures.push(new THREE.CanvasTexture(canvas));
  }

  // Buildings generation (~774 buildings)
  const buildingGeom = new THREE.BoxGeometry(1, 1, 1);
  const buildingMats = facadeTextures.map(tex => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, flatShading: true }));
  const instancedBuildings = buildingMats.map(mat => new THREE.InstancedMesh(buildingGeom, mat, 250));
  instancedBuildings.forEach(im => {
    im.castShadow = true;
    im.receiveShadow = true;
    scene.add(im);
  });
  const counts = [0, 0, 0, 0];
  const matrix = new THREE.Matrix4();

  for (let gx = 0; gx < gridCount; gx++) {
    for (let gz = 0; gz < gridCount; gz++) {
      if (gx === 0 || gx === gridCount - 1 || gz === 0 || gz === gridCount - 1) continue;
      const bx = -halfSize + gx * blockSize + blockSize / 2;
      const bz = -halfSize + gz * blockSize + blockSize / 2;
      const distCenter = Math.hypot(bx, bz);
      if (distCenter < 120) continue; // plaza / harbour opening

      const numBuildings = 2 + Math.floor(rng() * 2);
      for (let b = 0; b < numBuildings; b++) {
        const width = 16 + rng() * 16;
        const depth = 16 + rng() * 16;
        const height = 18 + rng() * 45;
        const ox = (b === 0 ? -1 : 1) * (14 + rng() * 6);
        const oz = (b === 0 ? 1 : -1) * (14 + rng() * 6);
        const fx = bx + ox;
        const fz = bz + oz;

        const dId = districtAt(fx, fz);
        let matIndex = Math.floor(rng() * 4);
        if (dId === 'verde') matIndex = 3;
        else if (dId === 'ceniza') matIndex = 2;
        else if (dId === 'muelle') matIndex = rng() < 0.6 ? 2 : 0;

        if (counts[matIndex] < 250) {
          matrix.makeScale(width, height, depth);
          matrix.setPosition(fx, height / 2, fz);
          instancedBuildings[matIndex].setMatrixAt(counts[matIndex], matrix);
          counts[matIndex]++;
          colliders.push({ minX: fx - width/2 - 1, maxX: fx + width/2 + 1, minZ: fz - depth/2 - 1, maxZ: fz + depth/2 + 1, radius: Math.hypot(width, depth)/2 });
        }
      }
    }
  }
  instancedBuildings.forEach((im, idx) => {
    im.count = counts[idx];
    im.instanceMatrix.needsUpdate = true;
  });

  // Palms (300 instanced palms)
  const palmGeo = new THREE.CylinderGeometry(0.4, 0.6, 10, 5);
  const palmMat = new THREE.MeshStandardMaterial({ color: 0x3E7C4F, roughness: 0.9, flatShading: true });
  const palmInst = new THREE.InstancedMesh(palmGeo, palmMat, 300);
  palmInst.castShadow = true;
  scene.add(palmInst);
  const palmMatrix = new THREE.Matrix4();
  for (let p = 0; p < 300; p++) {
    const px = (rng() - 0.5) * 1100;
    const pz = (rng() - 0.5) * 1100;
    palmMatrix.makeScale(1, 1, 1);
    palmMatrix.setPosition(px, 5, pz);
    palmInst.setMatrixAt(p, palmMatrix);
  }
  palmInst.instanceMatrix.needsUpdate = true;

  // Volcano at North edge [0, -500], 220m diameter
  const volcanoGroup = new THREE.Group();
  const volcanoGeo = new THREE.ConeGeometry(110, 180, 12);
  const volcanoMat = new THREE.MeshStandardMaterial({ color: 0x3E3A45, roughness: 0.95, flatShading: true });
  const volcanoMesh = new THREE.Mesh(volcanoGeo, volcanoMat);
  volcanoMesh.position.set(0, 90, -550);
  volcanoMesh.castShadow = true;
  volcanoGroup.add(volcanoMesh);

  // Crater glow
  const craterGeo = new THREE.CircleGeometry(25, 8);
  const craterMat = new THREE.MeshBasicMaterial({ color: 0xFF3B30 });
  const crater = new THREE.Mesh(craterGeo, craterMat);
  crater.rotation.x = -Math.PI / 2;
  crater.position.set(0, 180, -550);
  volcanoGroup.add(crater);
  scene.add(volcanoGroup);

  // Lighting rig (§7a)
  const dirLight = new THREE.DirectionalLight(0xFFB36B, 1.6);
  dirLight.position.set(300, 200, 200);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  const hemiLight = new THREE.HemisphereLight(0xFFD9A0, 0x4A5568, 0.55);
  scene.add(hemiLight);

  scene.fog = new THREE.FogExp2(0xF2A65A, 0.0022);

  return {
    colliders,
    collideCircle(x, z, r) {
      for (const c of colliders) {
        if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) {
          return true;
        }
      }
      return false;
    },
    setFinaleDusk(enabled) {
      if (enabled) {
        dirLight.color.setHex(0xFF8A5C);
        dirLight.intensity = 1.2;
        scene.fog.color.setHex(0xB36A6E);
        scene.fog.density = 0.0028;
      } else {
        dirLight.color.setHex(0xFFB36B);
        dirLight.intensity = 1.6;
        scene.fog.color.setHex(0xF2A65A);
        scene.fog.density = 0.0022;
      }
    }
  };
}
