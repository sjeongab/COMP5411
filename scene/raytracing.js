import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import {updateFPS} from '../fps.js';
import { objects } from '../object/addObjects.js';
import { loadRaytracingMaterial } from '../raytracing/raytracingBuffer.js';
import { raytracingVertexShader } from '../raytracing/raytracingVertexShader.js';
import { raytracingFragmentShader } from '../raytracing/raytracingFragmentShader.js';
import { addSkyBox } from '../object/addSkyBox.js'


let scene, camera, renderer;
let isRunning = true;

export function init(canvas){
    isRunning = true;
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.autoClear = false;

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.set(0, 75, 160);

    let cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.maxDistance = 400;
    cameraControls.minDistance = 10;
    cameraControls.update();

    addSkyBox(renderer, scene);

    // Custom shader for ray tracing
    const rayTraceMaterial = loadRaytracingMaterial(camera);
    

    // Create the quad mesh
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeometry, rayTraceMaterial);
    scene.add(quad);

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        rayTraceMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    });

    // Animate loop
    function animate(currentTime) {
        if(!isRunning) return;
        updateFPS(currentTime);
        cameraControls.update();

        rayTraceMaterial.uniforms.cameraPos.value.copy(camera.position);
        rayTraceMaterial.uniforms.uCamMatrix.value.copy(camera.matrixWorld);

        const viewMatrix = camera.matrixWorldInverse;
        const viewProj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, viewMatrix);
        rayTraceMaterial.uniforms.invViewProj.value.copy(viewProj.invert());

        renderer.setRenderTarget(null);
        renderer.clear(true, true, true);
        for(let i = 0; i<4; i++){
            renderer.render(scene, camera);
        }

        requestAnimationFrame(animate);
    }
    animate();
}

// Function to clean up resources when switching scenes
export function stop() {
    document.body.removeChild(document.body.lastElementChild);
    renderer.dispose();
    isRunning = false;
}
