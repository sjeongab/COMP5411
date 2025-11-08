// raytracingBuffer.js
import * as THREE from 'three';
import { raytracingVertexShader } from './raytracingVertexShader.js';
import { raytracingFragmentShader } from './raytracingFragmentShader.js';

function loadRaytracingMaterial() {
  const uniforms = {
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    cameraPos:  { value: new THREE.Vector3(0, 75, 160) },
    invViewProj:{ value: new THREE.Matrix4() },

    lightDir:   { value: new THREE.Vector3(5, 10, 7).normalize() },
    lightColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) },

    phongMode:  { value: 1 },

    spheres: {
      value: [
        { position: new THREE.Vector3(-60, 5, 0), radius: 5.0,  color: new THREE.Vector3(0.5, 1.0, 1.0), reflectivity: 0.4 },
        { position: new THREE.Vector3(-40,10, 0), radius:10.0,  color: new THREE.Vector3(0.0, 0.5, 0.0), reflectivity: 0.3 },
        { position: new THREE.Vector3(-10,30, 0), radius:30.0,  color: new THREE.Vector3(0.6, 0.4, 0.2), reflectivity: 0.5 },
        { position: new THREE.Vector3(20,15, 0), radius:15.0,  color: new THREE.Vector3(1.0, 0.0, 0.0), reflectivity: 0.4 },
        { position: new THREE.Vector3(50, 5, 0), radius:5.0,   color: new THREE.Vector3(0.5, 0.5, 0.5), reflectivity: 0.2 }
      ]
    },

    boxes: {
      value: [
        { position: new THREE.Vector3(-50, 5, 0), scale:10.0, color: new THREE.Vector3(1.0, 1.0, 0.0), reflectivity: 0.4 },
        { position: new THREE.Vector3(30,10, 0),  scale:10.0, color: new THREE.Vector3(0.0, 0.5, 0.5), reflectivity: 0.4 },
        { position: new THREE.Vector3(60, 5, 0),  scale:5.0,  color: new THREE.Vector3(0.5, 0.5, 0.5), reflectivity: 0.3 }
      ]
    },

    planes: {
      value: [
        {
          position:     new THREE.Vector3(0, 0, 0),
          normal:       new THREE.Vector3(0, 1, 0),
          offset:       0.0,
          color:        new THREE.Vector3(0.2, 0.2, 0.2),
          reflectivity: 0.6,
          scale:        500.0
        }
      ]
    }
  };

  return new THREE.ShaderMaterial({
    vertexShader: raytracingVertexShader,
    fragmentShader: raytracingFragmentShader,
    glslVersion: THREE.GLSL3,
    uniforms,
    depthTest: false,
    depthWrite: false
  });
}

export { loadRaytracingMaterial };
