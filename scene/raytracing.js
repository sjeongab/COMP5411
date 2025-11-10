import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import {updateFPS} from '../fps.js';
import { objects } from '../object/addObjects.js';
import { loadRaytracingMaterial } from '../raytracing/raytracingBuffer.js';
import { raytracingVertexShader } from '../raytracing/raytracingVertexShader.js';
import { raytracingFragmentShader } from '../raytracing/raytracingFragmentShader.js';


let scene, camera, renderer;
let isRunning = true;

export function init(canvas){
    isRunning = true;
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    //renderer.autoClear = false;

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.set(0, 75, 160);

    let cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.maxDistance = 400;
    cameraControls.minDistance = 10;
    cameraControls.update();

    // Full-screen quad for ray tracing (covers the entire viewport)
    

    
    // Custom shader for ray tracing
    const rayTraceMaterial = new THREE.ShaderMaterial({
    uniforms: {
        // Camera properties
        cameraPos: { value: camera.position },
        uCamMatrix: { value: camera.matrixWorld},
        invViewProj: { value: new THREE.Matrix4()},
        //cameraDir: { value: new THREE.Vector3(0, 0, -1) }, // Forward direction; updated in animate
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },

        spheres: {
            value: [
                // Sphere 1
                {
                    position: new THREE.Vector3(0, 20, 0),
                    radius: 20.0,
                    color: new THREE.Color(0XE7C88D), 
                    reflectivity: 0.6,
                    specular: new THREE.Color(0xB4955A), 
                    shininess: 1.3
                },
                // Sphere 2
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
                    position: new THREE.Vector3(-44, 4, 34),
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
                reflectivity: 0.8,
                specular: new THREE.Color(0x7299A3), 
                    shininess: 3.0 
            },
            {
                position: new THREE.Vector3(70, 9.5, 25),
                scale: 14,
                color: new THREE.Color(0xA3C0D3),
                reflectivity: 0.9,
                specular: new THREE.Color(0x888888), 
                shininess: 0.0 
            },

        ]},
        planes: {
            value: [
                { 
                    position: new THREE.Vector3(0, -1, 0),
                    normal: new THREE.Vector3(0, 1, 0), 
                    offset: 0.0, 
                    color: new THREE.Color(0x808080), 
                    reflectivity: 0.6, 
                    scale: 200.0,
                    specular: new THREE.Color(0x888888), 
                    shininess: 0.0 }
            ]

        },
    
        
        // Lighting (from earlier shaders)
        lightDir: { value: new THREE.Vector3(0.5, 0.7, 0.5).normalize() },
        lightColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
        //ambientColor: { value: new THREE.Color(0x404040) },
    },
    vertexShader: raytracingVertexShader,
    fragmentShader: raytracingFragmentShader,
    glslVersion: THREE.GLSL3,
    side: THREE.DoubleSide
    });

    // Create the quad mesh
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeometry, rayTraceMaterial);
    scene.add(quad);

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        //rayTraceMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    });

    // Animate loop
    function animate(currentTime) {
        if(!isRunning) return;
        updateFPS(currentTime);
        cameraControls.update();

        requestAnimationFrame(animate);

        rayTraceMaterial.uniforms.cameraPos.value.copy(camera.position);
        rayTraceMaterial.uniforms.uCamMatrix.value.copy(camera.matrixWorld);
        //const viewProj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); 
        const viewMatrix = camera.matrixWorldInverse;
        const viewProj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, viewMatrix);
        rayTraceMaterial.uniforms.invViewProj.value.copy(viewProj.invert());
        // Update camera direction (if camera rotates)
        //const forward = new THREE.Vector3(0, 0, -1);
        //forward.applyQuaternion(camera.quaternion);
        //rayTraceMaterial.uniforms.cameraDir.value.copy(forward);
        
        // Update camera position if it changes
        //rayTraceMaterial.uniforms.cameraPos.value.copy(camera.position);

        //renderer.setRenderTarget(null);
        //renderer.clear(true, true, true);
        renderer.render(scene, camera);
    }
    animate();
}

// Function to clean up resources when switching scenes
export function stop() {
    document.body.removeChild(document.body.lastElementChild);
    renderer.dispose();
    isRunning = false;
}
