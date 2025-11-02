import * as THREE from 'three'
import {gBufferMaterial} from '../gBuffer/gBuffer.js'

function addSphere(scene, config) {
    var sphereGeometry = new THREE.SphereGeometry(config.scale, 32, 16);
    const sphereGbufferMaterial = new THREE.ShaderMaterial({
              uniforms: {
                  uColor: { value: config.color },
                  uReflectivity: {value: config.reflectivity},
                  uShininess: {value: config.shininess},
                  uSpecular: {value: config.specular},
              },
              vertexShader: gBufferMaterial.vertexShader,
              fragmentShader: gBufferMaterial.fragmentShader,
              glslVersion:THREE.GLSL3,
          });
    var sphere = new THREE.Mesh(sphereGeometry, sphereGbufferMaterial);
    sphere.position.set(...config.position);
    scene.add(sphere);
}


export{addSphere};