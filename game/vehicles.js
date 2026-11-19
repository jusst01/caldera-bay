import * as THREE from 'three';

export const ROSTER = [
  { id: 'colibri', name: 'Colibrí', class: 'compact', topKmh: 130, accel: 9.5, grip: 0.72, mass: 900, chop: 50 },
  { id: 'sirena', name: 'Sirena', class: 'taxi', topKmh: 150, accel: 8.0, grip: 0.75, mass: 1200, chop: 80 },
  { id: 'caiman', name: 'Caimán', class: 'caiman', topKmh: 120, accel: 10.5, grip: 0.65, mass: 1900, chop: 100 },
  { id: 'mula', name: 'Mula 4x4', class: 'pickup', topKmh: 140, accel: 8.8, grip: 0.80, mass: 1600, chop: 120 },
  { id: 'boxer', name: 'Bóxer', class: 'truck', topKmh: 95, accel: 13.0, grip: 0.55, mass: 3200, chop: 90 },
  { id: 'fantasma', name: 'Fantasma', class: 'luxury', topKmh: 180, accel: 6.0, grip: 0.78, mass: 1600, chop: 300 },
  { id: 'corsario', name: 'Corsario S', class: 'muscle', topKmh: 190, accel: 5.2, grip: 0.70, mass: 1500, chop: 220 },
  { id: 'zorro', name: 'Zorro GT', class: 'sports', topKmh: 220, accel: 4.1, grip: 0.85, mass: 1300, chop: 320 },
  { id: 'relampago', name: 'Relámpago', class: 'super', topKmh: 260, accel: 3.2, grip: 0.90, mass: 1200, chop: 400 },
  { id: 'fenix', name: 'Fénix', class: 'police', topKmh: 200, accel: 4.8, grip: 0.82, mass: 1500, chop: 0, police: true },
  { id: 'perro', name: 'Perro', class: 'swat', topKmh: 150, accel: 7.0, grip: 0.75, mass: 2600, chop: 0, swat: true },
  { id: 'halcon', name: 'Halcón', class: 'heli', topKmh: 180, accel: 5.0, grip: 1.0, mass: 2000, chop: 0, heli: true },
];

export function getVehicleSpec(id) {
  return ROSTER.find(v => v.id === id) || ROSTER[0];
}

export function createCarMesh(specId, isPolice = false) {
  const group = new THREE.Group();
  const spec = getVehicleSpec(specId);

  let bodyColor = 0x2266cc;
  if (spec.class === 'sports' || spec.class === 'super') bodyColor = 0xcc2222;
  if (spec.class === 'luxury') bodyColor = 0x222222;
  if (spec.class === 'compact') bodyColor = 0xcccccc;
  if (isPolice || spec.police) bodyColor = 0x112244;
  if (spec.swat) bodyColor = 0x333333;

  const mat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5, flatShading: true });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });

  // Main body box
  const bodyGeo = new THREE.BoxGeometry(1.8, 0.7, 4.2);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  // Cabin box
  const cabinGeo = new THREE.BoxGeometry(1.6, 0.6, 2.2);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, 1.05, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // Wheels (4)
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const wheelPositions = [
    [-0.9, 0.35, 1.3], [0.9, 0.35, 1.3],
    [-0.9, 0.35, -1.3], [0.9, 0.35, -1.3]
  ];
  for (const pos of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(...pos);
    group.add(wheel);
  }

  if (isPolice || spec.police) {
    const barGeo = new THREE.BoxGeometry(0.8, 0.15, 0.3);
    const barMat = new THREE.MeshBasicMaterial({ color: 0x0066ff });
    const lightBar = new THREE.Mesh(barGeo, barMat);
    lightBar.position.set(0, 1.4, -0.2);
    group.add(lightBar);
  }

  return group;
}

export function createHeliMesh() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x112244, roughness: 0.4, flatShading: true });
  const bodyGeo = new THREE.BoxGeometry(1.6, 1.6, 4.5);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 1.0;
  group.add(body);

  // Spotlight cone
  const coneGeo = new THREE.ConeGeometry(12, 40, 16, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.set(0, -20, 0);
  cone.rotation.x = Math.PI;
  group.add(cone);

  return group;
}
