import * as THREE from 'three';

import {updateFPS} from '../fps.js';

let scene, camera, renderer, cube;
let isRunning = true;

// Function to initialize the Three.js scene
export function init(container) {
    // 1. Set up the scene
    scene = new THREE.Scene();

    // 2. Set up the camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // 3. Set up the renderer
    renderer = new THREE.WebGLRenderer({ container, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 4. Create a cube
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    isRunning = true;
    // 5. Start the animation loop
    function animate(currentTime)  {
      if(!isRunning) return;
      updateFPS(currentTime);
      console.log("Running Hybrid.js");
      // Rotate the cube
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;

      // Render the scene
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
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