import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import { TEST_FPS, updateFPS } from '../helper/fps.js';
import { addPlainObjects } from '../object/addObjects.js';
import { addSkyBox } from '../object/addSkyBox.js';

let scene, renderer, camera, cameraControls;
let isRunning = true;

export function init(canvas) {
  isRunning = true;

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);

  if (!renderer.domElement.parentElement) {
    document.body.appendChild(renderer.domElement);
  }

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
  camera.position.set(0, 75, 160);

  cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 0, 0);
  cameraControls.maxDistance = 400;
  cameraControls.minDistance = 10;
  cameraControls.enableDamping = true;
  cameraControls.dampingFactor = 0.25;
  cameraControls.update();

  addPlainObjects(scene);
  addSkyBox(renderer, scene);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  window.addEventListener('resize', onWindowResize);

  function animate(currentTime) {
    if (!isRunning) return;

    updateFPS(currentTime);
    cameraControls.update();

    for(let i = 0; i<TEST_FPS; i++){
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function onWindowResize() {
  if (!renderer || !camera) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

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
