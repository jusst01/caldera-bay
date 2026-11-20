// CALDERA BAY — vehicles.js
// 12-car roster table, arcade physics core, damage, two-tier procedural car meshes, helicopter mesh.
import * as THREE from '../three.module.min.js';

/**
 * Full 12-car roster table as data: name, class, top speed, 0-100 acceleration, grip, mass, chop value.
 */
export const VEHICLE_SPECS = [
  { id: 'colibri', name: 'Colibrí', class: 'compact', topSpeed: 130, accel: 9.5, grip: 0.72, mass: 900, chop: 50, color: 0xD9A05B },
  { id: 'sirena', name: 'Sirena', class: 'taxi', topSpeed: 150, accel: 8.0, grip: 0.75, mass: 1200, chop: 80, color: 0xF2B441, isTaxi: true },
  { id: 'caiman', name: 'Caimán', class: 'van', topSpeed: 120, accel: 10.5, grip: 0.65, mass: 1900, chop: 100, color: 0x7C8894, isVan: true },
  { id: 'mula', name: 'Mula 4x4', class: 'pickup', topSpeed: 140, accel: 8.8, grip: 0.80, mass: 1600, chop: 120, color: 0x4C8A57, isTruck: true },
  { id: 'boxer', name: 'Bóxer', class: 'truck', topSpeed: 95, accel: 13.0, grip: 0.55, mass: 3200, chop: 90, color: 0xB4552D, isTruck: true },
  { id: 'fantasma', name: 'Fantasma', class: 'luxury', topSpeed: 180, accel: 6.0, grip: 0.78, mass: 1600, chop: 300, color: 0x2E3A5C },
  { id: 'corsario-s', name: 'Corsario S', class: 'muscle', topSpeed: 190, accel: 5.2, grip: 0.70, mass: 1500, chop: 220, color: 0xC8402F, isMuscle: true },
  { id: 'zorro-gt', name: 'Zorro GT', class: 'sports', topSpeed: 220, accel: 4.1, grip: 0.85, mass: 1300, chop: 320, color: 0xFF7E5F, isSports: true },
  { id: 'relampago', name: 'Relámpago', class: 'super', topSpeed: 260, accel: 3.2, grip: 0.90, mass: 1200, chop: 400, color: 0xFF5E8A, isSuper: true },
  { id: 'fenix', name: 'Fénix', class: 'police cruiser', topSpeed: 200, accel: 4.8, grip: 0.82, mass: 1500, chop: 0, isPolice: true, color: 0xE8E4DA },
  { id: 'perro', name: 'Perro', class: 'SWAT van', topSpeed: 150, accel: 7.0, grip: 0.75, mass: 2600, chop: 0, isSwat: true, color: 0x3E3A45 },
  { id: 'halcon', name: 'Halcón', class: 'police heli', topSpeed: 0, accel: 0, grip: 0, mass: 0, chop: 0, isHeli: true }
];

/**
 * Resolves vehicle specification by id or name, ensuring 'zorro-gt' matches Zorro GT.
 */
export function getVehicleSpec(id) {
  if (!id) return VEHICLE_SPECS[0];
  const clean = id.toLowerCase().trim().replace(/\s+/g, '-');
  return VEHICLE_SPECS.find(s => s.id === clean || s.name.toLowerCase().includes(clean)) || VEHICLE_SPECS[0];
}

/**
 * Helper to taper box geometry top vertices.
 */
export function taperBox(w, h, d, sx = 0.8, sz = 0.8) {
  const geom = new THREE.BoxGeometry(w, h, d);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) {
      pos.setX(i, pos.getX(i) * sx);
      pos.setZ(i, pos.getZ(i) * sz);
    }
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

let glowTexCache = null;
function getGlowTexture() {
  if (glowTexCache) return glowTexCache;
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.4, 'rgba(255, 200, 150, 0.6)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  glowTexCache = new THREE.CanvasTexture(canvas);
  return glowTexCache;
}

/**
 * Adds radial glow sprite to parent object.
 */
export function addGlow(parent, colorHex, scale = 1.0, x = 0, y = 0, z = 0) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: getGlowTexture(), color: colorHex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  sprite.scale.set(0.6 * scale, 0.6 * scale, 1);
  sprite.position.set(x, y, z);
  parent.add(sprite);
  return sprite;
}

/**
 * Creates car mesh for full tier (~26 meshes) or std tier (~11 meshes).
 */
export function createCarMesh(specId, tier = 'full', customColor = null) {
  const spec = getVehicleSpec(specId);
  const group = new THREE.Group();
  const paintColor = customColor !== null ? customColor : spec.color;

  const paintMat = tier === 'full'
    ? new THREE.MeshStandardMaterial({ color: paintColor, metalness: 0.55, roughness: 0.34, envMapIntensity: 0.9 })
    : new THREE.MeshStandardMaterial({ color: paintColor, roughness: 0.42, metalness: 0.3, envMapIntensity: 0.7 });

  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0C1016, metalness: 0.9, roughness: 0.18, envMapIntensity: 1.2 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xD8D8DC, metalness: 1.0, roughness: 0.25 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: spec.isPolice ? 0x8A8A90 : 0xC9CDD4, metalness: 0.8, roughness: 0.3 });

  if (tier === 'std') {
    const body = new THREE.Mesh(taperBox(1.8, 0.55, 4.2, 0.85, 0.85), paintMat);
    body.position.set(0, 0.45, 0); body.castShadow = true; group.add(body);
    const cabin = new THREE.Mesh(taperBox(1.6, 0.45, 2.2, 0.75, 0.8), glassMat);
    cabin.position.set(0, 0.85, -0.2); group.add(cabin);

    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const [wx, wy, wz] of [[-0.92, 0.36, 1.42], [0.92, 0.36, 1.42], [-0.92, 0.36, -1.42], [0.92, 0.36, -1.42]]) {
      const wg = new THREE.Group();
      const tyreMesh = new THREE.Mesh(wheelGeo, tyreMat);
      const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.32, 8), rimMat);
      rimMesh.rotation.z = Math.PI / 2;
      wg.add(tyreMesh, rimMesh);
      wg.position.set(wx, wy, wz); group.add(wg);
    }
    return group;
  }

  const isTall = spec.isVan || spec.isTruck || spec.isSwat;
  const isTruck6 = spec.id === 'boxer';

  const body = new THREE.Mesh(taperBox(1.9, isTall ? 0.9 : 0.62, 4.4, 0.88, 0.82), paintMat);
  body.position.set(0, isTall ? 0.72 : 0.52, 0); body.castShadow = true; group.add(body);

  if (spec.isPolice || spec.color === 0xE8E4DA) {
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x1E2430, metalness: 0.5, roughness: 0.4 });
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.04, 1.4), hoodMat);
    hood.position.set(0, isTall ? 1.18 : 0.85, 1.4); hood.rotation.x = 0.07; group.add(hood);
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.04, 1.1), hoodMat);
    trunk.position.set(0, isTall ? 1.18 : 0.85, -1.5); group.add(trunk);
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.25, 3.2), new THREE.MeshBasicMaterial({ color: 0x111114 }));
    band.position.set(0, 0.55, 0); group.add(band);
  }

  const wedgeGeo = new THREE.BoxGeometry(1.8, 0.25, 1.3); wedgeGeo.rotateX(0.07);
  const wedge = new THREE.Mesh(wedgeGeo, paintMat);
  wedge.position.set(0, isTall ? 0.7 : 0.45, 1.55); group.add(wedge);

  const cabin = new THREE.Mesh(taperBox(1.65, isTall ? 0.65 : 0.48, 2.3, 0.75, 0.78), glassMat);
  cabin.position.set(0, isTall ? 1.35 : 0.88, -0.15); group.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 1.8), paintMat);
  roof.position.set(0, isTall ? 1.68 : 1.14, -0.15); group.add(roof);

  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.8 });
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.22, 0.25), bumperMat);
  frontBumper.position.set(0, isTall ? 0.4 : 0.32, 2.22); group.add(frontBumper);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.22, 0.25), bumperMat);
  rearBumper.position.set(0, isTall ? 0.4 : 0.32, -2.22); group.add(rearBumper);

  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.2), chromeMat);
  splitter.position.set(0, isTall ? 0.28 : 0.2, 2.3); group.add(splitter);
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.15), chromeMat);
  diffuser.position.set(0, isTall ? 0.3 : 0.22, -2.3); group.add(diffuser);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.08), chromeMat);
  grille.position.set(0, isTall ? 0.6 : 0.45, 2.25); group.add(grille);

  const headLightMat = new THREE.MeshBasicMaterial({ color: 0xFFF6D8 });
  const leftHl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.08), headLightMat);
  leftHl.position.set(-0.65, isTall ? 0.65 : 0.48, 2.24);
  const rightHl = leftHl.clone(); rightHl.position.x = 0.65;
  group.add(leftHl, rightHl);
  addGlow(group, 0xFFF6D8, 0.85, -0.65, isTall ? 0.65 : 0.48, 2.3);
  addGlow(group, 0xFFF6D8, 0.85, 0.65, isTall ? 0.65 : 0.48, 2.3);

  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.08), new THREE.MeshBasicMaterial({ color: 0xFF2418 }));
  tailBar.position.set(0, isTall ? 0.68 : 0.52, -2.24); group.add(tailBar);
  addGlow(group, 0xFF2418, 1.3, 0, isTall ? 0.68 : 0.52, -2.3);

  const mirrorMat = new THREE.MeshStandardMaterial({ color: paintColor, roughness: 0.3 });
  const leftMirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.15), mirrorMat);
  leftMirror.position.set(-0.98, isTall ? 1.05 : 0.78, 0.4);
  const rightMirror = leftMirror.clone(); rightMirror.position.x = 0.98;
  group.add(leftMirror, rightMirror);

  if (spec.isSports || spec.isSuper) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.35), chromeMat);
    wing.position.set(0, isTall ? 1.35 : 0.98, -1.9);
    const leftFin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.3), paintMat);
    leftFin.position.set(-0.75, isTall ? 1.22 : 0.85, -1.9);
    const rightFin = leftFin.clone(); rightFin.position.x = 0.75;
    group.add(wing, leftFin, rightFin);
  }
  if (spec.isMuscle) {
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.8), chromeMat);
    scoop.position.set(0, isTall ? 0.9 : 0.62, 1.2); group.add(scoop);
  }
  if (spec.isTaxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.25), new THREE.MeshBasicMaterial({ color: 0xFFF2CC }));
    sign.position.set(0, 1.32, 0.1); group.add(sign);
  }
  if (spec.isPolice) {
    const lbBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.3), new THREE.MeshStandardMaterial({ color: 0x1A1A22 }));
    lbBase.position.set(0, 1.22, 0.1);
    const redLens = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.15, 0.26), new THREE.MeshBasicMaterial({ color: 0xFF1A1A }));
    redLens.position.set(-0.22, 1.28, 0.1);
    const blueLens = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.15, 0.26), new THREE.MeshBasicMaterial({ color: 0x1A3AFF }));
    blueLens.position.set(0.22, 1.28, 0.1);
    const whiteCentre = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.28), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
    whiteCentre.position.set(0, 1.28, 0.1);
    group.add(lbBase, redLens, blueLens, whiteCentre);
    addGlow(group, 0xFF1A1A, 1.6, -0.22, 1.28, 0.1);
    addGlow(group, 0x1A3AFF, 1.6, 0.22, 1.28, 0.1);
    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.15), chromeMat);
    pushBar.position.set(0, 0.45, 2.32); group.add(pushBar);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9), chromeMat);
    antenna.position.set(0.7, 1.65, -1.2); group.add(antenna);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelPositions = isTruck6
    ? [[-0.95, 0.36, 1.5], [0.95, 0.36, 1.5], [-0.95, 0.36, -1.2], [0.95, 0.36, -1.2], [-0.95, 0.36, -1.9], [0.95, 0.36, -1.9]]
    : [[-0.92, 0.36, 1.42], [0.92, 0.36, 1.42], [-0.92, 0.36, -1.42], [0.92, 0.36, -1.42]];

  for (const [wx, wy, wz] of wheelPositions) {
    const wg = new THREE.Group();
    const tyreMesh = new THREE.Mesh(wheelGeo, tyreMat);
    const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.32, 8), rimMat);
    rimMesh.rotation.z = Math.PI / 2;
    const hubMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), chromeMat);
    wg.add(tyreMesh, rimMesh, hubMesh);
    wg.position.set(wx, wy, wz); group.add(wg);
  }
  return group;
}

/**
 * Creates police helicopter mesh with rotors and spotlight cone.
 */
export function createHeliMesh() {
  const group = new THREE.Group();
  const navyMat = new THREE.MeshStandardMaterial({ color: 0x1E2838, metalness: 0.6, roughness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0C1016, metalness: 0.9, roughness: 0.18, envMapIntensity: 1.2 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xD8D8DC, metalness: 1.0, roughness: 0.25 });

  const fuse = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16), navyMat);
  fuse.scale.set(0.95, 0.85, 2.3); fuse.position.set(0, 0, 0); fuse.castShadow = true; group.add(fuse);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), glassMat);
  nose.position.set(0, -0.1, 1.2); group.add(nose);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 3.2, 8), navyMat);
  boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.2, -2.4); group.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.8), navyMat);
  fin.position.set(0, 0.5, -3.8); group.add(fin);

  const skidBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6), chromeMat);
  skidBeam.rotation.z = Math.PI / 2;
  const lSkid = skidBeam.clone(); lSkid.position.set(-0.8, -0.85, 0);
  const rSkid = skidBeam.clone(); rSkid.position.set(0.8, -0.85, 0);
  group.add(lSkid, rSkid);

  const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7), chromeMat);
  for (const [sx, sz] of [[-0.7, 0.8], [0.7, 0.8], [-0.7, -0.8], [0.7, -0.8]]) {
    const st = strut.clone(); st.position.set(sx, -0.5, sz); group.add(st);
  }

  const rotorBar = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.06, 0.2), chromeMat);
  rotorBar.position.set(0, 1.15, 0); group.add(rotorBar);

  const blurDisc = new THREE.Mesh(
    new THREE.CircleGeometry(2.9, 24),
    new THREE.MeshBasicMaterial({ color: 0xAAAAAA, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
  );
  blurDisc.rotation.x = Math.PI / 2; blurDisc.position.set(0, 1.13, 0); group.add(blurDisc);

  const coneGeo = new THREE.ConeGeometry(5, 12, 16, 1, true); coneGeo.rotateX(-Math.PI / 2);
  const spotCone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xFFF2A0, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  spotCone.position.set(0, -6.5, -5); group.add(spotCone);

  return group;
}

/**
 * Arcade physics update core: engine force vs drag, yaw steering, handbrake grip and scrub.
 */
export function updateVehiclePhysics(car, dt, input) {
  if (car.engineDead || (car.durability !== undefined && car.durability <= 0)) {
    car.speed = 0; car.vx = 0; car.vz = 0; return;
  }
  const spec = car.spec || getVehicleSpec(car.specId || 'zorro-gt');
  const maxSpd = spec.topSpeed / 3.6;
  const accelRate = 100 / spec.accel;

  let targetForce = 0;
  if (input.throttle) targetForce = accelRate * spec.mass * input.throttle;
  if (input.braking) targetForce -= accelRate * 1.8 * spec.mass * input.braking;

  const drag = 0.5 * 1.2 * 0.32 * car.speed * Math.abs(car.speed);
  const rolling = car.speed * 18;
  const netForce = targetForce - (drag + rolling) * Math.sign(car.speed || 1);

  car.speed += (netForce / spec.mass) * dt;
  car.speed = Math.max(-maxSpd * 0.3, Math.min(maxSpd, car.speed));
  if (Math.abs(car.speed) < 0.2 && !input.throttle) car.speed = 0;

  if (Math.abs(car.speed) > 0.4) {
    let steerGrip = spec.grip;
    if (input.handbrake) {
      steerGrip = 0.35;
      car.speed *= 0.985;
    }
    car.heading += (input.steering || 0) * (2.4 / (1 + Math.abs(car.speed) * 0.04)) * steerGrip * (car.speed > 0 ? 1 : -1) * dt;
  }

  car.vx = Math.sin(car.heading) * car.speed;
  car.vz = Math.cos(car.heading) * car.speed;
  car.x += car.vx * dt;
  car.z += car.vz * dt;
}

/**
 * Applies collision damage: relative speed * mass ratio. Engine dies at 0 durability.
 */
export function applyCollisionDamage(carA, carB, relSpeed) {
  const massRatio = (carB.spec?.mass || 1200) / ((carA.spec?.mass || 1200) + (carB.spec?.mass || 1200));
  carA.durability = Math.max(0, (carA.durability ?? 100) - relSpeed * massRatio * 0.18);
  if (carA.durability <= 0) carA.engineDead = true;
}
