import * as THREE from 'three'
import {gBufferMaterial} from '../gBuffer/gBuffer.js'

function addCube(scene, config) {
    const cubeGeometry = new THREE.BoxGeometry(config.scale, config.scale, config.scale);
     const cubeGbufferMaterial = new THREE.ShaderMaterial({
              uniforms: {
                  uColor: { value: config.color },
                  uReflectivity: {value: config.reflectivity},
              },
              vertexShader: gBufferMaterial.vertexShader,
              fragmentShader: gBufferMaterial.fragmentShader,
              glslVersion:THREE.GLSL3,
          });
    const cube = new THREE.Mesh(cubeGeometry, cubeGbufferMaterial);
    cube.position.set(...config.position);
    scene.add(cube);
}

export{addCube};