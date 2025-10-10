import * as THREE from 'three'
import {ssrVertexShader} from './ssrVertexShader.js';
import {ssrFragmentShader} from './ssrFragmentShader.js';

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
    glslVersion: THREE.GLSL3
});

export {ssrBuffer, ssrBufferMaterial};