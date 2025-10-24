import * as THREE from 'three'
/*import {addPlainObjects} from './object/addObjects.js'
import * as THREE from 'three'
import { OrbitControls } from 'OrbitControls'
import {gBuffer} from './gBuffer/gBuffer.js'
import { addSkyBox } from './object/addSkyBox.js'
import {loadSSRMaterial} from './ssr/ssrBuffer.js'

const scene = new THREE.Scene();

// Assumes canvas variable exists in HTML
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Set renderer color space
if ('outputColorSpace' in renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else if ('outputEncoding' in renderer) {
  renderer.outputEncoding = THREE.sRGBEncoding;
}

// Disable auto clear to control background rendering
renderer.autoClear = false;

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
camera.position.set(0, 75, 160);
let cameraControls = new OrbitControls(camera, renderer.domElement);
cameraControls.target.set(0, 0, 0);
cameraControls.maxDistance = 400;
cameraControls.minDistance = 10;
cameraControls.update();

const fpsElem = document.getElementById('fps');
let lastFrameTime = 0;*/

/* ---------------- Skybox (online) ---------------- */
/*addSkyBox(renderer, scene);
addPlainObjects(scene);


const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);


function animate(currentTime) {
  
  requestAnimationFrame(animate);

  cameraControls.update();

    renderer.clear(true, true, true);
    renderer.render(scene, camera);
}
}

requestAnimationFrame(animate);*/

/* ---------------- Resize ---------------- */
/*window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});*/

let lastFrameTime, fpsElem;
let camera, cameraControls;

function draw(canvas) {

  //* ---------------- Set up camera ---------------- */
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
  camera.position.set(0, 75, 160);
  cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 0, 0);
  cameraControls.maxDistance = 400;
  cameraControls.minDistance = 10;
  cameraControls.update();

  /* ---------------- Display FPS ---------------- */
  lastFrameTime = 0;
  fpsElem = document.getElementById('fps');

  animate();

}

function animate(currentTime){
  requestAnimationFrame(animate);

  cameraControls.update();

  //renderer.clear(true, true, true);
  //renderer.render(scene, camera);
  
  /* ---------------- Display FPS ---------------- */
  currentTime *= 0.001;
  const deltaTime = currentTime - lastFrameTime;
  lastFrameTime = currentTime;
  const fps = 1 / deltaTime;
  fpsElem.textContent = `FPS: ${fps.toFixed(1)}`;

}