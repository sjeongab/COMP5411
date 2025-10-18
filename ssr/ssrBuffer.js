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
            gColor: { value: gBuffer.texture[0] },
            gNormal: { value: gBuffer.texture[1] },
            gPosition: { value: gBuffer.texture[2] },
            gReflection: { value: gBuffer.texture[3] },
            gDepth: { value: gBuffer.depthTexture },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    
            projectionMatrix: { value: camera.projectionMatrix },
            inverseProjectionMatrix: { value: new THREE.Matrix4() },
            inverseViewMatrix: { value: new THREE.Matrix4() },
            cameraWorldPosition: { value: camera.position },
    
            cameraNear: { value: camera.near },
            cameraFar: { value: camera.far },
        }
});

//export {ssrBuffer, ssrBufferMaterial};