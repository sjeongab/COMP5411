import * as THREE from 'three'
import {ssrVertexShader} from './ssrVertexShader.js';
import {ssrFragmentShader} from './ssrFragmentShader.js';
import {gBuffer} from '../gBuffer/gBuffer.js';

const ssrBuffer = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
    }
);


const ssrBufferMaterial = new THREE.RawShaderMaterial({
    vertexShader: ssrVertexShader,
    fragmentShader: ssrFragmentShader,
    glslVersion: THREE.GLSL3,
    uniforms: {
        gBufferTexture: { value: gBuffer.texture },
        depthBuffer: { value: gBuffer.depthTexture },
        finalSceneTexture: { value: gBuffer.texture },
        inverseProjectionMatrix: { value: new THREE.Matrix4() },
        inverseViewMatrix: { value: new THREE.Matrix4() },
    },
});

export {ssrBuffer, ssrBufferMaterial};