import * as THREE from 'three'
import {gBufferVertexShader} from './gBufferVertexShader.js';
import {gBufferFragmentShader} from './gBufferFragmentShader.js';

const depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
depthTexture.format = THREE.DepthFormat;
depthTexture.type = THREE.UnsignedIntType;

var gBuffer = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    count: 5,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    depthTexture: depthTexture,
});

gBuffer.textures[0].name = 'gColor';
gBuffer.textures[1].name = 'gNormal';
gBuffer.textures[2].name = 'gReflection';
gBuffer.textures[3].name = 'gShininess';
gBuffer.textures[4].name = 'gSpecular';

const gBufferMaterial = new THREE.ShaderMaterial({
    vertexShader: gBufferVertexShader,
    fragmentShader: gBufferFragmentShader,
    glslVersion: THREE.GLSL3,
    uniforms: {
            uColor: { value: new THREE.Color(0xffffff) },
            uReflectivity: { value: 0.0 },
    },
});

gBufferMaterial.depthWrite = true;
gBufferMaterial.depthTest = true;
gBufferMaterial.transparent = false;

export {gBuffer, gBufferMaterial};