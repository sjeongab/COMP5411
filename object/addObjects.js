// object/addObjects.js
import { addCube } from './cube.js'
import { addSphere } from './sphere.js'
import { addPlane } from './addPlane.js'
import * as THREE from 'three'
import { gBufferMaterial } from '../gBuffer/gBuffer.js'  // G-buffer pass material

const objects = [
    {type: 'plane', color: new THREE.Color(0xaaaaaa), reflectivity: 1.0},
    { type: 'cube', position: [-40.0, 5, 15.0], scale: 10, rotationSpeed: 0, color: new THREE.Color(0XF0DD98), reflectivity: 1.0 },
    { type: 'sphere', position: [0, 20, 0], scale: 20, rotationSpeed: 0.8, color: new THREE.Color(0XE7C88D), reflectivity: 1.0 },
    { type: 'sphere', position: [-35.0, 8, -20.0], scale: 8, rotationSpeed: 1.2, color: new THREE.Color(0xE7577F7), reflectivity: 0.5},
    { type: 'sphere', position: [-20, 9, 40.0], scale: 9.0, rotationSpeed: -1.0, color: new THREE.Color(0xB1C193), reflectivity: 0.5 },
    { type: 'cube', position: [35, 9, 40.0], scale: 18, rotationSpeed: 0, color: new THREE.Color(0xA5CCD6), reflectivity: 0.5},
    // Additional shapes
    { type: 'sphere', position: [15.0, 10, 25], scale: 10, rotationSpeed: 0.9, color: new THREE.Color(0xDF9D97), reflectivity: 1.0 },
    { type: 'cube', position: [70, 7, 25], scale: 14, rotationSpeed: 0, color: new THREE.Color(0xA3C0D3), reflectivity: 1.0 },
    { type: 'sphere', position: [-55, 5, 45], scale: 5, rotationSpeed: 1.5, color: new THREE.Color(0xABD0C4), reflectivity: 1.0 },
    { type: 'sphere', position: [0, 100, 100], scale: 0.5, rotationSpeed: 0, color: new THREE.Color(0xFFFFFF), reflectivity: 0.5 }, //light source
];


function addPlainObjects(scene) {
  objects.forEach((object) => {
    if (object.type === 'plane') {
      const planeGeometry = new THREE.PlaneGeometry(200, 200);
      const planeMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
      scene.add(plane);
    } else if (object.type == 'sphere'){
      const sphereGeometry = new THREE.SphereGeometry(object.scale, 32, 32);
      const sphereMaterial = new THREE.MeshPhongMaterial({ color: object.color, shininess: object.reflectivity });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(...object.position); // Position the sphere above the plane
      scene.add(sphere);
    }
    else{
      const cubeGeometry = new THREE.BoxGeometry(object.scale, object.scale, object.scale);
      const cubeMaterial = new THREE.MeshPhongMaterial({ color: object.color, shininess: object.reflectivity });
      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
      cube.position.set(...object.position); // Position the cube above the plane
      scene.add(cube);
    }
  });
}


function addSSRObjects(scene) {
  objects.forEach((object) => {
    if (object.type === 'plane') {
      addPlane(scene, object); 
    } else if (object.type == 'sphere'){
      addSphere(scene, object);
    }
    else{
      addCube(scene, object);
    }
  });
}

/**
 * White spherical marker at the light position:
 * - Use gBufferMaterial.clone() so it writes into the MRT/G-buffer
 * - Reflectivity = 0 so it does not reflect itself
 * - isInteractive = false so it won't be altered in setupInteractiveObjects
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

export { addPlainObjects, addSSRObjects, addLightMarker }
