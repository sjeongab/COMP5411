import * as THREE from 'three'
import {ssrVertexShader} from './ssrVertexShader.js';
import {ssrFragmentShader} from './ssrFragmentShader.js';
import {gBuffer} from '../gBuffer/gBuffer.js';

function loadSSRMaterial(ssrCamera) {
    const ssrMaterial = new THREE.ShaderMaterial({
    vertexShader: ssrVertexShader,
    fragmentShader: ssrFragmentShader,
    glslVersion: THREE.GLSL3,
    uniforms: {
        gColor: { value: gBuffer.textures[0] },
        gNormal: { value: gBuffer.textures[1] },
        gReflection: { value: gBuffer.textures[2] },
        gShininess: { value: gBuffer.textures[3] },
        gSpecular: { value: gBuffer.textures[4] },
        gDepth: { value: gBuffer.depthTexture },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        cameraPos: { value: ssrCamera.position },
        cameraMatrix: { value: ssrCamera.matrixWorld},
        invViewProj: {value: new THREE.Matrix4()},
        viewProj: {value: new THREE.Matrix4()},
        lightDir: { value: new THREE.Vector3(0.5, 0.7, 0.5).normalize() },

        spheres: {
                    value: [
                        {
                            position: new THREE.Vector3(0, 20, 0),
                            radius: 20.0,
                        },
                        {
                            position: new THREE.Vector3(-35, 8, -20),
                            radius: 8.0,
                        },
                        {
                            position: new THREE.Vector3(-20, 9.5, 40),
                            radius: 9.0,
                        },
                        {
                            position: new THREE.Vector3(15, 10, 25),
                            radius:10.0,
                        },
                        {
                            position: new THREE.Vector3(-55, 5, 45),
                            radius: 5.0,
                        },
                    ]
                },
                boxes: { value: [
                    {
                        position: new THREE.Vector3(-40, 5.1, 15),
                        scale: 10,
                    },
                    {
                        position: new THREE.Vector3(35, 9.5, 40.0),
                        scale: 18,
                    },
                    {
                        position: new THREE.Vector3(70, 9.5, 25),
                        scale: 14,
                    },
        
                ]},
                planes: {
                    value: [
                        { 
                            position: new THREE.Vector3(0, -1, 0),
                            normal: new THREE.Vector3(0, 1, 0), 
                            offset: 0.0, 
                            scale: 200.0,}
                    ]
        
                },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending
    });
    return ssrMaterial;
}

export {loadSSRMaterial};