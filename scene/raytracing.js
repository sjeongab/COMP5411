import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import { TEST_FPS, updateFPS } from '../helper/fps.js';
import { loadRaytracingMaterial } from '../raytracing/raytracingBuffer.js';
import { addSkyBox } from '../object/addSkyBox.js'


let scene, camera, renderer;
let isRunning = true;

export function init(canvas){
    isRunning = true;
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.set(0, 75, 160);

    let cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.maxDistance = 400;
    cameraControls.minDistance = 10;
    cameraControls.update();

    addSkyBox(renderer, scene);

    const rayTraceMaterial = loadRaytracingMaterial(camera);
    
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeometry, rayTraceMaterial);
    scene.add(quad);


    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        rayTraceMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    });

    function animate(currentTime) {
        if(!isRunning) return;
        updateFPS(currentTime);
        cameraControls.update();

        rayTraceMaterial.uniforms.cameraPos.value.copy(camera.position);
        const viewMatrix = camera.matrixWorldInverse;
        const viewProj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, viewMatrix);
        rayTraceMaterial.uniforms.invViewProj.value.copy(viewProj.invert());

        for(let i = 0; i < TEST_FPS; i++){
            renderer.render(scene, camera);
        }

        requestAnimationFrame(animate);
    }
    animate();
}

export function stop() {
    document.body.removeChild(document.body.lastElementChild);
    renderer.dispose();
    isRunning = false;
}
