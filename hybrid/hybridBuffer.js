import * as THREE from 'three';
import { hybridVertexShader } from '../hybrid/hybridVertexShader.js';
import { hybridFragmentShader } from '../hybrid/hybridFragmentShader.js';
import {gBuffer} from '../gBuffer/gBuffer.js'

function loadHybridMaterial(camera) {
    const hybridMaterial = new THREE.ShaderMaterial({
    vertexShader: hybridVertexShader,
    fragmentShader: hybridFragmentShader,
    glslVersion: THREE.GLSL3,
    uniforms: {
        gColor: { value: gBuffer.textures[0] },
        gNormal: { value: gBuffer.textures[1] },
        gReflection: { value: gBuffer.textures[2] },
        gDepth: { value: gBuffer.depthTexture },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },

        cameraPos: { value: camera.position},
        uCamMatrix: { value: camera.matrixWorld},
        invViewProj: {value: new THREE.Matrix4()},
        viewProj: {value: new THREE.Matrix4()},
        spheres: {
            value: [
                {
                    position: new THREE.Vector3(0, 20, 0),
                    radius: 20.0,
                    color: new THREE.Color(0XE7C88D), 
                    reflectivity: 0.6,
                    specular: new THREE.Color(0xB4955A), 
                    shininess: 1.3
                },
                {
                    position: new THREE.Vector3(-35, 8, -20),
                    radius: 8.0,
                    color: new THREE.Color(0xE7577F7),
                    reflectivity: 1.0,
                    specular: new THREE.Color(0xB4244C4), 
                    shininess: 0.0 
                },
                {
                    position: new THREE.Vector3(-20, 9.5, 40),
                    radius: 9.0,
                    color: new THREE.Color(0xB1C193), 
                    reflectivity: 0.5,
                    specular: new THREE.Color(0xA0B082), 
                    shininess: 5.0 
                },
                {
                    position: new THREE.Vector3(15, 10, 25),
                    radius:10.0,
                    color: new THREE.Color(0xDF9D97), 
                    reflectivity: 0.0,
                    specular: new THREE.Color(0x888888), 
                    shininess: 0.0 
                },
                {
                    position: new THREE.Vector3(-55, 5, 45),
                    radius: 5.0,
                    color: new THREE.Color(0xABD0C4), 
                    reflectivity: 0.2,
                    specular: new THREE.Color(0x78A091), 
                    shininess: 10.0 
                },
            ]
        },
        boxes: { value: [
            {
                position: new THREE.Vector3(-40, 5.1, 15),
                scale: 10,
                color: new THREE.Color(0XF0DD98),
                reflectivity: 0.7,
                specular: new THREE.Color(0x888888), 
                shininess: 10.0 
            },
            {
                position: new THREE.Vector3(35, 9.5, 40.0),
                scale: 18,
                color: new THREE.Color(0xA5CCD6),
                reflectivity: 0.1,
                specular: new THREE.Color(0x7299A3), 
                shininess: 3.0 
            },
            {
                position: new THREE.Vector3(70, 9.5, 25),
                scale: 14,
                color: new THREE.Color(0xA3C0D3),
                reflectivity: 0.0,
                specular: new THREE.Color(0x92B0C2), 
                shininess: 1.6 
            },

        ]},
        planes: {
            value: [
                { 
                    position: new THREE.Vector3(0, -1, 0),
                    normal: new THREE.Vector3(0, 1, 0), 
                    offset: 0.0, 
                    color: new THREE.Color(0x808080), 
                    reflectivity: 0.7, 
                    scale: 200.0,
                    specular: new THREE.Color(0x888888), 
                    shininess: 0.0 }
            ]

        },
        lightDir: { value: new THREE.Vector3(0.5, 0.7, 0.5).normalize() },
        lightColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending
    });

    return hybridMaterial
};

export { loadHybridMaterial };
