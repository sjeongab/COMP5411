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
        type: THREE.FloatType, // Use float texture for high-precision data
    }
);


/*
const depthTexture = new THREE.DepthTexture(
    window.innerWidth,
    window.innerHeight
);
depthTexture.type = THREE.UnsignedIntType;
gBuffer.depthTexture = depthTexture; */


const ssrBufferMaterial = new THREE.RawShaderMaterial({
    vertexShader: ssrVertexShader,
    fragmentShader: ssrFragmentShader,
    glslVersion: THREE.GLSL3
});

export {ssrBuffer, ssrBufferMaterial};