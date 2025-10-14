import * as THREE from 'three'
import {gBufferVertexShader} from './gBufferVertexShader.js';
import {gBufferFragmentShader} from './gBufferFragmentShader.js';

const gBuffer = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
});

const depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
depthTexture.type = THREE.UnsignedIntType;
gBuffer.depthTexture = depthTexture;

const gBufferMaterial = new THREE.RawShaderMaterial({
    vertexShader: gBufferVertexShader,
    fragmentShader: gBufferFragmentShader,
    glslVersion: THREE.GLSL3,
    /*uniforms: {
            normalMatrix: { value: new THREE.Matrix3() },
            modelViewMatrix: { value: new THREE.Matrix4() },
            projectionMatrix: { value: new THREE.Matrix4() },
    },*/
});

export {gBuffer, gBufferMaterial};