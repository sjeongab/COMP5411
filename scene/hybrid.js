import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls'
import {updateFPS} from '../fps.js';
import {addSSRObjects} from '../object/addObjects.js'
import { addSkyBox } from '../object/addSkyBox.js'
import { loadHybridMaterial } from '../hybrid/hybridBuffer.js'
import {gBuffer} from '../gBuffer/gBuffer.js'

let scene, camera, renderer;
let isRunning = true;

// Function to initialize the Three.js scene
export function init(canvas) {
  isRunning = true;
    // Set up the scene
    scene = new THREE.Scene();
    const ssrScene = new THREE.Scene();

    // Set up the renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    document.body.appendChild(renderer.domElement);
    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if ('outputEncoding' in renderer) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    // Set up the camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.set(0, 75, 160);

    let cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.maxDistance = 400;
    cameraControls.minDistance = 10;
    cameraControls.update();

    // Add objects
    addSSRObjects(scene);
    addSkyBox(renderer, scene);
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const hybridMaterial = loadHybridMaterial(camera);

    const postProcessQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hybridMaterial);   
    ssrScene.add(postProcessQuad);

    // Start the animation loop
    function animate(currentTime)  {
      if(!isRunning) return;
      updateFPS(currentTime);
      cameraControls.update();

      hybridMaterial.uniforms.uCamMatrix.value.copy(camera.matrixWorld);
      hybridMaterial.uniforms.invViewProj.value.copy(camera.projectionMatrix).invert();

      renderer.setRenderTarget(gBuffer);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);

      // Render the scene
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      renderer.render(ssrScene, camera);

      // Request the next animation frame
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate); // Return the animation frame ID
}

// Function to clean up resources when switching scenes
export function stop() {
    document.body.removeChild(document.body.lastElementChild);
    renderer.dispose();
    isRunning = false;
}