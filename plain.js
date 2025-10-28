import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls'
import {updateFPS} from './fps.js';
import {addPlainObjects} from './object/addObjects.js'
import { addSkyBox } from './object/addSkyBox.js'

let scene, camera, renderer, cube;
let isRunning = true;

// Function to initialize the Three.js scene
export function init(canvas) {
  isRunning = true;
    // 1. Set up the scene
    scene = new THREE.Scene();

    // 3. Set up the renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    //renderer.autoClear = false;
    document.body.appendChild(renderer.domElement);
    /*if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if ('outputEncoding' in renderer) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }*/

    // 2. Set up the camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
    camera.position.set(0, 75, 160);

    let cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.maxDistance = 400;
    cameraControls.minDistance = 10;
    cameraControls.update();

    // 4. Create a cube
    addPlainObjects(scene);
    addSkyBox(renderer, scene);
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // 5. Start the animation loop
    function animate(currentTime)  {
      if(!isRunning) return;
      updateFPS(currentTime);
      cameraControls.update();
      //console.log("Running plain.js");
      // Rotate the cube
      //cube.rotation.x += 0.01;
      //cube.rotation.y += 0.01;

      // Render the scene
      //renderer.setRenderTarget(null);
      //renderer.clear(true, true, true);
      renderer.render(scene, camera);

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