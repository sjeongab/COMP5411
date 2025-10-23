import * as THREE from 'three'
import {ssrVertexShader} from './ssrVertexShader.js';
import {ssrFragmentShader} from './ssrFragmentShader.js';
import {gBuffer, gColorTexture, gNormalTexture, gPositionTexture, gReflectionTexture} from '../gBuffer/gBuffer.js';

/* ---------------- SSR material ---------------- */
function loadSSRMaterial(ssrCamera, mode) {
    const ssrMaterial = new THREE.ShaderMaterial({
    vertexShader: ssrVertexShader,
    fragmentShader: ssrFragmentShader,
    glslVersion: THREE.GLSL3,
    uniforms: {
        gColor: { value: gColorTexture },
        gNormal: { value: gNormalTexture },
        gPosition: { value: gPositionTexture },
        gReflection: { value: gReflectionTexture },
        gDepth: { value: gBuffer.depthTexture },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        projectionMatrix: { value: ssrCamera.projectionMatrix },
        inverseProjectionMatrix: { value: new THREE.Matrix4() },
        inverseViewMatrix: { value: new THREE.Matrix4() },
        cameraWorldPosition: { value: ssrCamera.position },
        cameraNear: { value: ssrCamera.near },
        cameraFar: { value: ssrCamera.far },
        mode: { value: mode === 'scene' ? 0 : 1 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending
    });
    return ssrMaterial;
}

export {loadSSRMaterial};