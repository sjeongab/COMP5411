// plane/planeBuffer.js
import * as THREE from 'three';
import { planeVertexShader } from './planeVertexShader.js';
import { planeFragmentShader } from './planeFragmentShader.js';
import {gBuffer} from '../gBuffer/gBuffer.js'

function createReflectivePlane(scene) {  // Pass the scene as a parameter now
  const geometry = new THREE.PlaneGeometry(200, 200);
  geometry.rotateX(-Math.PI / 2);

  // Collect actual spheres and boxes from the scene
  const spheres = [];
  const boxes = [];
  scene.traverse((child) => {
    if (child.isMesh && child.visible) {
      if (child.geometry.type === 'SphereGeometry') {
        const position = child.position.clone();
        const radius = (child.geometry.parameters.radius || 1) * child.scale.x;  // Handle scaled geometry; assume uniform scale
        const color = child.material.color ? child.material.color.clone() : new THREE.Vector3(1,1,1);  // Default white if no color
        spheres.push({ position, radius, color });
      } else if (child.geometry.type === 'BoxGeometry') {
        const position = child.position.clone();
        const scale = (child.geometry.parameters.width || 1) * child.scale.x;  // Full size; assume uniform cube
        const color = child.material.color ? child.material.color.clone() : new THREE.Vector3(1,1,1);
        boxes.push({ position, scale, color });
      }
    }
  });

  // If counts don't match your shader arrays, pad with dummies (e.g., radius=0) or adjust shader
  // For now, assuming exactly 5 spheres and 3 boxes; log warning if mismatch
  if (spheres.length !== 5 || boxes.length !== 3) {
    console.warn(`Found ${spheres.length} spheres and ${boxes.length} boxes; shader expects 5 and 3. Adjust shader arrays if needed.`);
  }

  const uniforms = {
    cameraPos: { value: new THREE.Vector3(0, 75, 160) },
    lightDir: { value: new THREE.Vector3(5, 10, 7).normalize() },
    lightColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    planeColor: { value: new THREE.Vector3(0.2, 0.2, 0.2) },
    planeReflectivity: { value: 0.2 },
    spheres: { value: spheres.slice(0, 5) },  // Take first 5; adjust if more
    boxes: { value: boxes.slice(0, 3) },     // Take first 3; adjust if more
    gColor: { value: gBuffer.textures[0] },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uViewProjectionMatrix: {value: new THREE.Matrix4()},
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: planeVertexShader,
    fragmentShader: planeFragmentShader,
    glslVersion: THREE.GLSL3,
    uniforms,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = false;

  return { mesh, material };
}

export { createReflectivePlane };
