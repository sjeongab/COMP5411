// object/addObjects.js
import { addCube } from './cube.js'
import { addSphere } from './sphere.js'
import * as THREE from 'three'
import { gBufferMaterial } from '../gBuffer/gBuffer.js'  // متریال پاس G-buffer

const objects = [
  { type: 'cube',   position: [-20.0, 8, 10.0],  scale: 7,  rotationSpeed: 0,   color: [0.5, 1.0, 0.5, 1.0] },
  { type: 'sphere', position: [0, 10, 0],        scale: 13, rotationSpeed: 0.8, color: [0.5, 1.0, 0.5, 1.0] },
  { type: 'sphere', position: [-15.0, 3, -10.0], scale: 5,  rotationSpeed: 1.2, color: [0.5, 0.5, 1.0, 1.0] },
  { type: 'sphere', position: [0, 10, 20.0],     scale: 6.0,rotationSpeed: -1.0,color: [1.0, 1.0, 0.5, 1.0] },
  { type: 'cube',   position: [15, 5, 25.0],     scale: 12, rotationSpeed: 0,   color: [0.5, 1.0, 1.0, 1.0] },
  // Additional shapes
  { type: 'sphere', position: [3.0, 7, 15],      scale: 7,  rotationSpeed: 0.9, color: [1.0, 0.8, 0.2, 1.0] },
  { type: 'cube',   position: [45, 9, 15],       scale: 9,  rotationSpeed: 0,   color: [0.2, 0.5, 1.0, 1.0] },
  { type: 'sphere', position: [-35, 3, 30],      scale: 3,  rotationSpeed: 1.5, color: [0.8, 0.2, 0.8, 1.0] },
];

function addObjects(scene) {
  objects.forEach((object) => {
    if (object.type === 'cube') {
      addCube(scene, object);
    } else {
      addSphere(scene, object);
    }
  });
}

/**
 * مارکر کره‌ایِ سفید در مکان نور:
 * - از gBufferMaterial.clone() استفاده می‌کنیم تا داخل MRT/G-buffer نوشته شود
 * - Reflectivity=0 تا خودش بازتاب نشود
 * - isInteractive=false تا در setupInteractiveObjects دستکاری نشود
 */
function addLightMarker(scene, position = [10, 20, 10], radius = 3.0) {
  const mat = gBufferMaterial.clone();
  mat.uniforms.uColor.value = new THREE.Color(0xffffff);
  mat.uniforms.uReflectivity.value = 0.0;

  const marker = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), mat);
  marker.name = 'LightMarker';
  marker.userData.isInteractive = false;
  marker.position.set(position[0], position[1], position[2]);
  scene.add(marker);

  console.log('[addLightMarker] added at', marker.position.clone());
  return marker;
}

export { addObjects, addLightMarker }
