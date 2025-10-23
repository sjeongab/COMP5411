import * as THREE from 'three'
import {gBufferMaterial} from '../gBuffer/gBuffer.js'

function addPlane(scene, config) {
    const planeGeometry = new THREE.PlaneGeometry(200, 200); // Width, Height
      const planeGbufferMaterial = new THREE.ShaderMaterial({
          uniforms: {
              uColor: { value: config.color},
              uReflectivity: {value: config.reflectivity},
          },
          vertexShader: gBufferMaterial.vertexShader,
          fragmentShader: gBufferMaterial.fragmentShader,
          glslVersion:THREE.GLSL3,
      });
      const plane = new THREE.Mesh(planeGeometry, planeGbufferMaterial);
      plane.rotateX(-Math.PI/2);
      scene.add(plane);
}

export{addPlane};