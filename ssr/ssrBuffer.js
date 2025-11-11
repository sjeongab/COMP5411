import * as THREE from 'three'
import {ssrVertexShader} from './ssrVertexShader.js';
import {ssrFragmentShader} from './ssrFragmentShader.js';
import {gBuffer} from '../gBuffer/gBuffer.js';

/* ---------------- SSR material ---------------- */
function loadSSRMaterial(ssrCamera) {
    const ssrMaterial = new THREE.ShaderMaterial({
    vertexShader: ssrVertexShader,
    fragmentShader: ssrFragmentShader,
    glslVersion: THREE.GLSL3,
    uniforms: {
        gColor: { value: gBuffer.textures[0] },
        gNormal: { value: gBuffer.textures[1] },
        gPosition: { value: gBuffer.textures[2] },
        gReflection: { value: gBuffer.textures[3] },
        gDepth: { value: gBuffer.depthTexture },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uCamMatrix: { value: ssrCamera.matrixWorld},
        invViewProj: {value: new THREE.Matrix4()},
        
        projectionMatrix: { value: ssrCamera.projectionMatrix },
        inverseProjectionMatrix: { value: new THREE.Matrix4() },
        inverseViewMatrix: { value: new THREE.Matrix4() },
        cameraPos: { value: ssrCamera.position },
        cameraNear: { value: ssrCamera.near },
        cameraFar: { value: ssrCamera.far },
        lightDir: { value: new THREE.Vector3(0.5, 0.7, 0.5).normalize() },
        lightColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending
    });
    return ssrMaterial;
}

export {loadSSRMaterial};