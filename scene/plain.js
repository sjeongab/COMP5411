// scene/plain.js
import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import { updateFPS } from '../fps.js';
import { addPlainObjects } from '../object/addObjects.js';
import { addSkyBox } from '../object/addSkyBox.js';

let scene, renderer, camera, cameraControls;
let isRunning = true;

// ---------- init ----------
export function init(canvas) {
  isRunning = true;

  // Scene
  scene = new THREE.Scene();

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);

  // If canvas is not already in the DOM, add it
  if (!renderer.domElement.parentElement) {
    document.body.appendChild(renderer.domElement);
  }

  // Camera
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    500
  );
  camera.position.set(0, 75, 160);

  // OrbitControls
  cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 0, 0);
  cameraControls.maxDistance = 400;
  cameraControls.minDistance = 10;
  cameraControls.enableDamping = true;
  cameraControls.dampingFactor = 0.25;
  cameraControls.update();

  // Objects (spheres, boxes, and possibly old plane)
  addPlainObjects(scene);

  // Skybox
  addSkyBox(renderer, scene);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  // Resize handler
  window.addEventListener('resize', onWindowResize);

  // Loop
  function animate(currentTime) {
    if (!isRunning) return;

    updateFPS(currentTime);
    cameraControls.update();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// ---------- Resize ----------
function onWindowResize() {
  if (!renderer || !camera) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

// ---------- stop ----------
export function stop() {
  isRunning = false;

  window.removeEventListener('resize', onWindowResize);

  if (renderer) {
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement);
    }
  }

  scene = null;
  renderer = null;
  camera = null;
  cameraControls = null;
}
